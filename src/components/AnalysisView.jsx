import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useLayout } from '../context/LayoutContext';
import { useStockfish } from '../hooks/useStockfish';
import { classifyMove, evalToNumber, detectCriticalMoments } from '../utils/chess';
import { STOCKFISH_DEPTH, STOCKFISH_MULTIPV } from '../utils/constants';
import ChessBoard from './ChessBoard';
import MoveList from './MoveList';
import ReflectionPanel from './ReflectionPanel';
import EnginePanel from './EnginePanel';

export default function AnalysisView() {
  const { state, dispatch, persistGame } = useGame();
  const { positions, currentMoveIndex, analyses, analysisRevealed, history, phase,
    criticalMoments, criticalMoveList, fullAnalysisRunning } = state;
  const { isReady, analyzePosition } = useStockfish();
  const { mode } = useLayout();
  const isCompact = mode === 'compact';

  // Dynamic board size with ResizeObserver for compact mode
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(360);

  useEffect(() => {
    if (!isCompact || !containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isCompact]);
  const [activeTab, setActiveTab] = useState('reflect');
  const analysisRunRef = useRef(false);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'NEXT_MOVE' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'PREV_MOVE' });
      } else if (e.key === 'Home') {
        dispatch({ type: 'FIRST_MOVE' });
      } else if (e.key === 'End') {
        dispatch({ type: 'LAST_MOVE' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch]);

  // Switch to reflect tab when entering reflection phase
  useEffect(() => {
    if (state.reflectionPhase) {
      setActiveTab('reflect');
    }
  }, [state.reflectionPhase]);

  // In deep review: switch to engine tab when analysis is revealed
  useEffect(() => {
    if (phase === 'deep_review' && analysisRevealed[currentMoveIndex] && currentMoveIndex > 0) {
      setActiveTab('engine');
    }
  }, [analysisRevealed, currentMoveIndex, phase]);

  // In first pass: always show engine tab (analysis is freely visible)
  useEffect(() => {
    if (phase === 'first_pass' && currentMoveIndex > 0) {
      setActiveTab('engine');
    }
  }, [currentMoveIndex, phase]);

  // Run full game analysis when engine is ready
  const runFullAnalysis = useCallback(async () => {
    if (!isReady || analysisRunRef.current || history.length === 0) return;
    analysisRunRef.current = true;

    const totalPositions = positions.length;
    dispatch({ type: 'START_FULL_ANALYSIS', payload: totalPositions });

    const evalCache = {};

    for (let i = 0; i < totalPositions; i++) {
      const fen = positions[i].fen;
      dispatch({ type: 'UPDATE_FULL_ANALYSIS_PROGRESS', payload: i + 1 });

      try {
        const result = await analyzePosition(fen, STOCKFISH_DEPTH, STOCKFISH_MULTIPV);

        if (result) {
          evalCache[i] = result.eval;

          let classification = null;
          if (i > 0 && evalCache[i - 1] !== undefined) {
            const prevEval = evalCache[i - 1];
            const currentEval = result.eval;
            const playerColor = i % 2 === 1 ? 'w' : 'b';
            classification = classifyMove(
              evalToNumber(prevEval),
              evalToNumber(currentEval),
              playerColor
            );
          }

          const analysisData = {
            eval: result.eval,
            bestMove: result.bestMove,
            bestMoveUci: result.bestMoveUci,
            topMoves: result.lines,
            classification,
            playerMove: positions[i]?.san,
            evalBefore: i > 0 ? (evalCache[i - 1] ?? 0) : 0,
          };

          dispatch({
            type: 'SET_ANALYSIS',
            payload: { moveIndex: i, analysis: analysisData },
          });
        }
      } catch (e) {
        console.error(`Analysis failed for position ${i}:`, e);
      }

      await new Promise(r => setTimeout(r, 50));
    }

    dispatch({ type: 'FINISH_FULL_ANALYSIS' });
  }, [isReady, positions, history, analyzePosition, dispatch]);

  // After analysis finishes, detect critical moments
  useEffect(() => {
    if (!fullAnalysisRunning && Object.keys(analyses).length > 0 && criticalMoveList.length === 0) {
      const critical = detectCriticalMoments(analyses, positions.length - 1);
      const critObj = {};
      const critList = [];
      for (const [idx, data] of critical) {
        critObj[idx] = data;
        critList.push(idx);
      }
      critList.sort((a, b) => a - b);
      dispatch({
        type: 'SET_CRITICAL_MOMENTS',
        payload: { criticalMoments: critObj, criticalMoveList: critList },
      });
    }
  }, [fullAnalysisRunning, analyses, positions, criticalMoveList, dispatch]);

  useEffect(() => {
    runFullAnalysis();
  }, [isReady]);

  // Auto-save periodically
  useEffect(() => {
    const interval = setInterval(() => persistGame(), 10000);
    return () => clearInterval(interval);
  }, [persistGame]);

  const handleViewSummary = () => {
    persistGame();
    dispatch({ type: 'SET_VIEW', payload: 'summary' });
  };

  const handleStartDeepReview = () => {
    dispatch({ type: 'START_DEEP_REVIEW' });
  };

  const analysisComplete = !fullAnalysisRunning && Object.keys(analyses).length > 0;
  const criticalCount = criticalMoveList.length;
  const reviewedCount = criticalMoveList.filter(i => analysisRevealed[i]).length;

  const boardSize = isCompact
    ? Math.min(280, containerWidth - 56)
    : Math.min(560, window.innerHeight - 140);

  return (
    <div className="analysis-layout" ref={containerRef}>
      <ChessBoard boardSize={boardSize} />
      <div className="right-panels">
        {/* Phase banner */}
        {phase === 'first_pass' && (
          <div className="phase-banner first-pass">
            <div className="phase-banner-content">
              <span className="phase-label">First Pass</span>
              <span className="phase-desc">
                {fullAnalysisRunning
                  ? 'Engine analyzing... replay the game freely while you wait.'
                  : analysisComplete
                    ? `Analysis complete. ${criticalCount} critical moment${criticalCount !== 1 ? 's' : ''} found.`
                    : 'Replay the game and recall your thinking.'}
              </span>
            </div>
            {analysisComplete && criticalCount > 0 && (
              <button className="phase-action-btn" onClick={handleStartDeepReview}>
                Start Deep Review ({criticalCount})
              </button>
            )}
          </div>
        )}
        {phase === 'deep_review' && (
          <div className="phase-banner deep-review">
            <div className="phase-banner-content">
              <span className="phase-label">Deep Review</span>
              <span className="phase-desc">
                {reviewedCount}/{criticalCount} critical moments reviewed
              </span>
            </div>
            <div className="phase-nav-btns">
              <button
                className="phase-nav-btn"
                onClick={() => dispatch({ type: 'PREV_CRITICAL' })}
                title="Previous critical moment"
              >
                ◁ Prev
              </button>
              <button
                className="phase-nav-btn"
                onClick={() => dispatch({ type: 'NEXT_CRITICAL' })}
                title="Next critical moment"
              >
                Next ▷
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="panel-tabs">
          {phase === 'deep_review' && (
            <button
              className={`panel-tab ${activeTab === 'reflect' ? 'active' : ''}`}
              onClick={() => setActiveTab('reflect')}
            >
              Reflect
            </button>
          )}
          <button
            className={`panel-tab ${activeTab === 'engine' ? 'active' : ''}`}
            onClick={() => setActiveTab('engine')}
          >
            Engine
          </button>
          <button
            className={`panel-tab ${activeTab === 'moves' ? 'active' : ''}`}
            onClick={() => setActiveTab('moves')}
          >
            Moves
          </button>
        </div>

        {/* Panel content */}
        <div className="panel-content">
          {activeTab === 'reflect' && phase === 'deep_review' && <ReflectionPanel />}
          {activeTab === 'engine' && <EnginePanel />}
          {activeTab === 'moves' && <MoveList />}
        </div>

        {/* Bottom action bar */}
        <div style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 8,
        }}>
          {phase === 'deep_review' && (
            <button
              className="header-btn"
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'first_pass' })}
            >
              Free Browse
            </button>
          )}
          <button
            className="header-btn"
            onClick={handleViewSummary}
            style={{ flex: 1, textAlign: 'center' }}
          >
            View Summary
          </button>
          <button
            className="header-btn"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
