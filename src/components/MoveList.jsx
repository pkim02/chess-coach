import { useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { MOVE_CLASSIFICATIONS } from '../utils/constants';
import { evalToText } from '../utils/chess';
import './MoveList.css';

export default function MoveList() {
  const { state, dispatch } = useGame();
  const { history, currentMoveIndex, analyses, analysisRevealed } = state;
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  // Group moves into pairs (white + black)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: { san: history[i]?.san, index: i + 1 },
      black: history[i + 1] ? { san: history[i + 1]?.san, index: i + 2 } : null,
    });
  }

  const getClassification = (moveIndex) => {
    if (!analysisRevealed[moveIndex]) return null;
    return analyses[moveIndex]?.classification;
  };

  const getEval = (moveIndex) => {
    if (!analysisRevealed[moveIndex]) return null;
    const evalData = analyses[moveIndex]?.eval;
    if (evalData === undefined || evalData === null) return null;
    return evalToText(evalData);
  };

  return (
    <div className="move-list">
      <div className="move-list-header">
        <span>Moves</span>
        {state.gameData && (
          <span className="move-list-result">{state.gameData.result}</span>
        )}
      </div>
      <div className="move-list-body">
        {movePairs.map((pair) => (
          <div key={pair.number} className="move-pair">
            <span className="move-number">{pair.number}.</span>
            <MoveCell
              san={pair.white.san}
              moveIndex={pair.white.index}
              isActive={currentMoveIndex === pair.white.index}
              classification={getClassification(pair.white.index)}
              evalText={getEval(pair.white.index)}
              onClick={() => dispatch({ type: 'GO_TO_MOVE', payload: pair.white.index })}
              activeRef={currentMoveIndex === pair.white.index ? activeRef : null}
            />
            {pair.black && (
              <MoveCell
                san={pair.black.san}
                moveIndex={pair.black.index}
                isActive={currentMoveIndex === pair.black.index}
                classification={getClassification(pair.black.index)}
                evalText={getEval(pair.black.index)}
                onClick={() => dispatch({ type: 'GO_TO_MOVE', payload: pair.black.index })}
                activeRef={currentMoveIndex === pair.black.index ? activeRef : null}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MoveCell({ san, moveIndex, isActive, classification, evalText, onClick, activeRef }) {
  const classInfo = classification ? MOVE_CLASSIFICATIONS[classification] : null;

  return (
    <button
      ref={activeRef}
      className={`move-cell ${isActive ? 'active' : ''} ${classification || ''}`}
      onClick={onClick}
      style={classInfo ? { borderLeftColor: classInfo.color } : undefined}
    >
      <span className="move-san">{san}</span>
      {classInfo && (
        <span className="move-classification" style={{ color: classInfo.color }}>
          {classInfo.symbol}
        </span>
      )}
    </button>
  );
}
