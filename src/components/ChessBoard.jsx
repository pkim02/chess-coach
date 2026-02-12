import { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGame } from '../context/GameContext';
import EvalBar from './EvalBar';
import MoveNav from './MoveNav';
import './ChessBoard.css';

export default function ChessBoard({ boardSize = 560 }) {
  const { state } = useGame();
  const { positions, currentMoveIndex, analyses } = state;

  const position = positions[currentMoveIndex]?.fen || 'start';
  const lastMove = positions[currentMoveIndex]?.move;

  // Get eval for current position (from analysis of current move)
  const currentEval = analyses[currentMoveIndex]?.eval ?? 0;

  // Highlight last move squares
  const customSquareStyles = useMemo(() => {
    if (!lastMove) return {};
    return {
      [lastMove.from]: { backgroundColor: 'rgba(155, 199, 0, 0.41)' },
      [lastMove.to]: { backgroundColor: 'rgba(155, 199, 0, 0.41)' },
    };
  }, [lastMove]);

  // Custom board colors to match chess.com
  const customDarkSquareStyle = { backgroundColor: '#739552' };
  const customLightSquareStyle = { backgroundColor: '#ebecd0' };

  return (
    <div className="board-section">
      <div className="board-player-info top">
        <span className="player-name">{state.gameData?.black || 'Black'}</span>
      </div>
      <div className="board-and-eval">
        <EvalBar evaluation={currentEval} />
        <div className="board-wrapper" style={{ width: boardSize, height: boardSize }}>
          <Chessboard
            position={position}
            boardWidth={boardSize}
            customDarkSquareStyle={customDarkSquareStyle}
            customLightSquareStyle={customLightSquareStyle}
            customSquareStyles={customSquareStyles}
            animationDuration={200}
            arePiecesDraggable={false}
            boardOrientation="white"
          />
        </div>
      </div>
      <div className="board-player-info bottom">
        <span className="player-name">{state.gameData?.white || 'White'}</span>
      </div>
      <MoveNav />
    </div>
  );
}
