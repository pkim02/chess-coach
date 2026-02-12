import { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { parsePGN, classifyMove, evalToNumber, computeAccuracy, computeMetacognitionScore, detectCriticalMoments } from '../utils/chess';
import { saveGame, getGames } from '../utils/storage';

const GameContext = createContext(null);

const initialState = {
  // App view: 'import' | 'analysis' | 'summary'
  view: 'import',

  // Analysis phase: 'first_pass' | 'deep_review'
  phase: 'first_pass',

  // Game data
  gameId: null,
  gameData: null,
  positions: [],
  history: [],

  // Navigation
  currentMoveIndex: 0,

  // Analysis results per move index
  analyses: {},

  // Critical moments detected after full analysis
  criticalMoments: {},
  criticalMoveList: [],

  // Reflections per move index (only for critical moments)
  reflections: {},

  // Current state
  reflectionPhase: false,
  analysisRevealed: {},

  // Stats
  skipCount: 0,
  totalReflections: 0,

  // Full game analysis state
  fullAnalysisRunning: false,
  fullAnalysisProgress: 0,
  fullAnalysisTotal: 0,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_GAME': {
      const { gameData, positions, history } = action.payload;
      return {
        ...initialState,
        view: 'analysis',
        phase: 'first_pass',
        gameId: uuidv4(),
        gameData,
        positions,
        history,
        currentMoveIndex: 0,
      };
    }

    case 'LOAD_SAVED_GAME':
      return {
        ...initialState,
        ...action.payload,
        view: 'analysis',
      };

    case 'GO_TO_MOVE': {
      const idx = action.payload;
      const isCritical = !!state.criticalMoments[idx];
      const needsReflection = state.phase === 'deep_review' && isCritical && !state.analysisRevealed[idx] && idx > 0;
      return {
        ...state,
        currentMoveIndex: idx,
        reflectionPhase: needsReflection,
      };
    }

    case 'NEXT_MOVE': {
      const next = Math.min(state.currentMoveIndex + 1, state.positions.length - 1);
      const isCritical = !!state.criticalMoments[next];
      const needsReflection = state.phase === 'deep_review' && isCritical && !state.analysisRevealed[next] && next > 0;
      return {
        ...state,
        currentMoveIndex: next,
        reflectionPhase: needsReflection,
      };
    }

    case 'PREV_MOVE': {
      const prev = Math.max(state.currentMoveIndex - 1, 0);
      const isCritical = !!state.criticalMoments[prev];
      const needsReflection = state.phase === 'deep_review' && isCritical && !state.analysisRevealed[prev] && prev > 0;
      return {
        ...state,
        currentMoveIndex: prev,
        reflectionPhase: needsReflection,
      };
    }

    case 'FIRST_MOVE':
      return { ...state, currentMoveIndex: 0, reflectionPhase: false };

    case 'LAST_MOVE': {
      const last = state.positions.length - 1;
      const isCritical = !!state.criticalMoments[last];
      const needsReflection = state.phase === 'deep_review' && isCritical && !state.analysisRevealed[last] && last > 0;
      return {
        ...state,
        currentMoveIndex: last,
        reflectionPhase: needsReflection,
      };
    }

    case 'NEXT_CRITICAL': {
      const list = state.criticalMoveList;
      const nextCrit = list.find(i => i > state.currentMoveIndex);
      if (nextCrit === undefined) return state;
      const needsReflection = !state.analysisRevealed[nextCrit];
      return {
        ...state,
        currentMoveIndex: nextCrit,
        reflectionPhase: needsReflection,
      };
    }

    case 'PREV_CRITICAL': {
      const list = state.criticalMoveList;
      const prevCrit = [...list].reverse().find(i => i < state.currentMoveIndex);
      if (prevCrit === undefined) return state;
      const needsReflection = !state.analysisRevealed[prevCrit];
      return {
        ...state,
        currentMoveIndex: prevCrit,
        reflectionPhase: needsReflection,
      };
    }

    case 'SUBMIT_REFLECTION': {
      const { moveIndex, reflection } = action.payload;
      return {
        ...state,
        reflections: { ...state.reflections, [moveIndex]: reflection },
        reflectionPhase: false,
        analysisRevealed: { ...state.analysisRevealed, [moveIndex]: true },
        totalReflections: state.totalReflections + 1,
      };
    }

    case 'SKIP_REFLECTION': {
      const moveIndex = action.payload;
      return {
        ...state,
        reflections: { ...state.reflections, [moveIndex]: { skipped: true } },
        reflectionPhase: false,
        analysisRevealed: { ...state.analysisRevealed, [moveIndex]: true },
        skipCount: state.skipCount + 1,
        totalReflections: state.totalReflections + 1,
      };
    }

    case 'SET_ANALYSIS': {
      const { moveIndex, analysis } = action.payload;
      return {
        ...state,
        analyses: { ...state.analyses, [moveIndex]: analysis },
      };
    }

    case 'SET_CRITICAL_MOMENTS': {
      const { criticalMoments, criticalMoveList } = action.payload;
      return {
        ...state,
        criticalMoments,
        criticalMoveList,
      };
    }

    case 'START_DEEP_REVIEW': {
      const firstCrit = state.criticalMoveList[0];
      return {
        ...state,
        phase: 'deep_review',
        currentMoveIndex: firstCrit !== undefined ? firstCrit : state.currentMoveIndex,
        reflectionPhase: firstCrit !== undefined && !state.analysisRevealed[firstCrit],
      };
    }

    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'START_FULL_ANALYSIS':
      return { ...state, fullAnalysisRunning: true, fullAnalysisProgress: 0, fullAnalysisTotal: action.payload };

    case 'UPDATE_FULL_ANALYSIS_PROGRESS':
      return { ...state, fullAnalysisProgress: action.payload };

    case 'FINISH_FULL_ANALYSIS':
      return { ...state, fullAnalysisRunning: false };

    case 'SET_VIEW':
      return { ...state, view: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function GameProvider({ children, initialGameId }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(!!initialGameId);

  // Load saved game on mount if initialGameId is provided (pop-out tab)
  useEffect(() => {
    if (!initialGameId) return;
    (async () => {
      const games = await getGames();
      const game = games.find(g => g.id === initialGameId);
      if (game) {
        dispatch({
          type: 'LOAD_SAVED_GAME',
          payload: {
            gameId: game.id,
            gameData: game.gameData,
            positions: game.gameData.positions,
            history: game.gameData.history,
            analyses: game.analyses || {},
            reflections: game.reflections || {},
            criticalMoments: game.criticalMoments || {},
            criticalMoveList: game.criticalMoveList || [],
            analysisRevealed: game.analysisRevealed || {},
            skipCount: game.skipCount || 0,
            totalReflections: game.totalReflections || 0,
            phase: game.phase || 'first_pass',
          },
        });
      }
      setIsLoading(false);
    })();
  }, [initialGameId]);

  const loadGame = useCallback((pgnText) => {
    const parsed = parsePGN(pgnText);
    dispatch({
      type: 'LOAD_GAME',
      payload: {
        gameData: parsed,
        positions: parsed.positions,
        history: parsed.history,
      },
    });
    return parsed;
  }, []);

  const persistGame = useCallback(async () => {
    if (!state.gameId || !state.gameData) return;
    await saveGame({
      id: state.gameId,
      gameData: state.gameData,
      analyses: state.analyses,
      reflections: state.reflections,
      criticalMoments: state.criticalMoments,
      criticalMoveList: state.criticalMoveList,
      skipCount: state.skipCount,
      totalReflections: state.totalReflections,
      analysisRevealed: state.analysisRevealed,
      phase: state.phase,
      date: new Date().toISOString(),
    });
  }, [state]);

  if (isLoading) {
    return <div className="app-loading">Loading game...</div>;
  }

  return (
    <GameContext.Provider value={{ state, dispatch, loadGame, persistGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
