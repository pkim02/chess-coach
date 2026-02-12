import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { MOVE_CLASSIFICATIONS } from '../utils/constants';
import { evalToText, evalBarPercent } from '../utils/chess';
import { getMoveExplanation } from '../utils/anthropic';
import { getApiKey } from '../utils/storage';
import './EnginePanel.css';

export default function EnginePanel() {
  const { state } = useGame();
  const { currentMoveIndex, analyses, analysisRevealed, reflections, positions, phase, criticalMoments } = state;
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const analysis = analyses[currentMoveIndex];
  const isCritical = !!criticalMoments[currentMoveIndex];
  // In first_pass mode, analysis is always visible.
  // In deep_review mode, critical moments require reflection first.
  const revealed = phase === 'first_pass' || !isCritical || analysisRevealed[currentMoveIndex];
  const reflection = reflections[currentMoveIndex];

  // Fetch AI explanation when analysis is revealed
  useEffect(() => {
    if (!revealed || !analysis || currentMoveIndex === 0) {
      setAiExplanation('');
      return;
    }

    // Only get AI explanation if there's a meaningful difference
    const classification = analysis.classification;
    if (!classification) return;

    const isInteresting = ['inaccuracy', 'mistake', 'blunder', 'miss', 'brilliant', 'great'].includes(classification);
    if (!isInteresting && !reflection?.reasoning) {
      setAiExplanation('');
      return;
    }

    let cancelled = false;
    (async () => {
      const apiKey = await getApiKey();
      if (cancelled) return;
      if (!apiKey) {
        setAiExplanation('Add your Anthropic API key in Settings to get AI-powered move explanations.');
        return;
      }

      setLoadingAi(true);
      const prevPosition = positions[currentMoveIndex - 1]?.fen || '';
      const playerMove = positions[currentMoveIndex]?.san || '';
      const bestMove = analysis.topMoves?.[0]?.san || analysis.bestMove || '';
      const evalBefore = evalToText(analyses[currentMoveIndex - 1]?.eval ?? analysis.evalBefore ?? 0);
      const evalAfter = evalToText(analysis.eval);

      try {
        const text = await getMoveExplanation(
          apiKey, prevPosition, playerMove, bestMove,
          reflection?.reasoning || '', evalBefore, evalAfter, classification
        );
        if (!cancelled) setAiExplanation(text);
      } catch { /* ignore */ }
      if (!cancelled) setLoadingAi(false);
    })();

    return () => { cancelled = true; };
  }, [currentMoveIndex, revealed]);

  if (currentMoveIndex === 0) {
    return (
      <div className="engine-panel">
        <div className="engine-empty">
          <p>Navigate to a move to see engine analysis.</p>
        </div>
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="engine-panel">
        <div className="engine-locked">
          <span className="lock-icon">&#128274;</span>
          <p>Complete your reflection on this critical moment to reveal the engine analysis.</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="engine-panel">
        <div className="engine-empty">
          <div className="spinner" />
          <p>Analyzing position...</p>
        </div>
      </div>
    );
  }

  const classification = analysis.classification;
  const classInfo = classification ? MOVE_CLASSIFICATIONS[classification] : null;
  const topMoves = analysis.topMoves || analysis.lines || [];
  const playerMove = positions[currentMoveIndex]?.san;

  return (
    <div className="engine-panel">
      {/* Move classification header */}
      {classInfo && (
        <div className="engine-classification" style={{ borderLeftColor: classInfo.color }}>
          <span className="class-icon">{classInfo.icon}</span>
          <div>
            <span className="class-label" style={{ color: classInfo.color }}>
              {classInfo.label}
            </span>
            <span className="class-move">
              {playerMove} {classInfo.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Top engine lines */}
      <div className="engine-lines">
        <div className="engine-lines-header">Engine Top Moves</div>
        {topMoves.slice(0, 3).map((line, idx) => (
          <EngineLineRow key={idx} line={line} rank={idx + 1} playerMove={playerMove} />
        ))}
      </div>

      {/* AI Explanation */}
      {(aiExplanation || loadingAi) && (
        <div className="ai-explanation">
          <div className="ai-explanation-header">
            <span>&#9733;</span> Coach's Analysis
          </div>
          {loadingAi ? (
            <div className="ai-loading">
              <div className="spinner" /> Thinking...
            </div>
          ) : (
            <p className="ai-explanation-text">{aiExplanation}</p>
          )}
        </div>
      )}

      {/* Reflection summary */}
      {reflection && !reflection.skipped && (
        <div className="reflection-summary">
          <div className="reflection-summary-header">Your Reflection</div>
          {reflection.reasoning && (
            <div className="reflection-summary-item">
              <span className="rs-label">Your idea:</span>
              <span className="rs-value">{reflection.reasoning}</span>
            </div>
          )}
          {reflection.candidates && (
            <div className="reflection-summary-item">
              <span className="rs-label">Candidates:</span>
              <span className="rs-value">{reflection.candidates}</span>
            </div>
          )}
          {reflection.threats && (
            <div className="reflection-summary-item">
              <span className="rs-label">Threats:</span>
              <span className="rs-value">{reflection.threats}</span>
            </div>
          )}
          <div className="reflection-summary-item">
            <span className="rs-label">Confidence:</span>
            <span className="rs-value">
              {'★'.repeat(reflection.confidence)}{'☆'.repeat(5 - reflection.confidence)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function EngineLineRow({ line, rank, playerMove }) {
  const evalText = evalToText(line.score);
  const isWhiteAdvantage = evalBarPercent(line.score) >= 50;
  const san = line.san || line.sanLine?.[0] || '';
  const continuation = line.sanLine?.slice(1, 6).join(' ') || '';
  const isPlayerMove = san === playerMove;

  return (
    <div className={`engine-line ${rank === 1 ? 'best-line' : ''}`}>
      <div className={`engine-line-eval ${isWhiteAdvantage ? 'white' : 'black'}`}>
        {evalText}
      </div>
      <div className="engine-line-moves">
        <span className={`engine-line-san ${isPlayerMove ? 'player-match' : ''}`}>
          {san}
        </span>
        {continuation && (
          <span className="engine-line-continuation">{continuation}</span>
        )}
      </div>
    </div>
  );
}
