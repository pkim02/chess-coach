import { useGame } from '../context/GameContext';
import './MoveNav.css';

export default function MoveNav() {
  const { state, dispatch } = useGame();
  const { currentMoveIndex, positions } = state;
  const totalMoves = positions.length - 1;

  return (
    <div className="move-nav">
      <button
        className="nav-btn"
        onClick={() => dispatch({ type: 'FIRST_MOVE' })}
        disabled={currentMoveIndex === 0}
        title="First move"
      >
        ⟪
      </button>
      <button
        className="nav-btn"
        onClick={() => dispatch({ type: 'PREV_MOVE' })}
        disabled={currentMoveIndex === 0}
        title="Previous move"
      >
        ◁
      </button>
      <span className="nav-indicator">
        {currentMoveIndex} / {totalMoves}
      </span>
      <button
        className="nav-btn"
        onClick={() => dispatch({ type: 'NEXT_MOVE' })}
        disabled={currentMoveIndex >= totalMoves}
        title="Next move"
      >
        ▷
      </button>
      <button
        className="nav-btn"
        onClick={() => dispatch({ type: 'LAST_MOVE' })}
        disabled={currentMoveIndex >= totalMoves}
        title="Last move"
      >
        ⟫
      </button>
    </div>
  );
}
