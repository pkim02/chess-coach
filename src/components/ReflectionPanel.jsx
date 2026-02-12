import { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { CRITICAL_MOMENT_PROMPTS } from '../utils/constants';
import './ReflectionPanel.css';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function ReflectionPanel() {
  const { state, dispatch } = useGame();
  const { currentMoveIndex, positions, reflectionPhase, skipCount,
    criticalMoments, criticalMoveList, analysisRevealed,
    fullAnalysisRunning, fullAnalysisProgress, fullAnalysisTotal, phase } = state;

  const [reasoning, setReasoning] = useState('');
  const [candidates, setCandidates] = useState('');
  const [threats, setThreats] = useState('');
  const [confidence, setConfidence] = useState(3);

  const isCritical = !!criticalMoments[currentMoveIndex];
  const momentType = criticalMoments[currentMoveIndex]?.type || 'turning_point';
  const promptSet = CRITICAL_MOMENT_PROMPTS[momentType] || CRITICAL_MOMENT_PROMPTS.turning_point;

  // Pick varied prompts based on the type of critical moment
  const prompts = useMemo(() => ({
    reasoning: pickRandom(promptSet.reasoning),
    candidates: pickRandom(promptSet.candidates),
    threats: pickRandom(promptSet.threats),
    label: promptSet.label || 'Critical Moment',
  }), [currentMoveIndex, momentType]);

  // Not in reflection phase — show status
  if (!reflectionPhase || currentMoveIndex === 0) {
    return <ReflectionStatus state={state} />;
  }

  const currentMove = positions[currentMoveIndex];
  const moveNumber = Math.ceil(currentMoveIndex / 2);
  const moveSan = currentMove?.san;

  const handleSubmit = () => {
    dispatch({
      type: 'SUBMIT_REFLECTION',
      payload: {
        moveIndex: currentMoveIndex,
        reflection: { reasoning, candidates, threats, confidence, skipped: false, momentType },
      },
    });
    setReasoning('');
    setCandidates('');
    setThreats('');
    setConfidence(3);
  };

  const handleSkip = () => {
    dispatch({ type: 'SKIP_REFLECTION', payload: currentMoveIndex });
    setReasoning('');
    setCandidates('');
    setThreats('');
    setConfidence(3);
  };

  const skipWarning = skipCount >= 2
    ? `You've skipped ${skipCount} critical moments. These are the positions that matter most for improvement.`
    : null;

  const remaining = criticalMoveList.filter(i => !analysisRevealed[i]).length;

  return (
    <div className="reflection-panel">
      <div className="reflection-header">
        <div className="reflection-top-row">
          <span className="reflection-move-badge">
            {moveNumber}. {currentMoveIndex % 2 === 1 ? '' : '...'}{moveSan}
          </span>
          <span className="reflection-moment-type" data-type={momentType}>
            {prompts.label}
          </span>
        </div>
        <span className="reflection-subtitle">
          {remaining} critical moment{remaining !== 1 ? 's' : ''} remaining
        </span>
      </div>

      <div className="reflection-form">
        <div className="reflection-field">
          <label>{prompts.reasoning}</label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Describe your thinking..."
            rows={3}
          />
        </div>

        <div className="reflection-field">
          <label>{prompts.candidates}</label>
          <input
            type="text"
            value={candidates}
            onChange={(e) => setCandidates(e.target.value)}
            placeholder="e.g. Nf3, Bc4, d4"
          />
        </div>

        <div className="reflection-field">
          <label>{prompts.threats}</label>
          <textarea
            value={threats}
            onChange={(e) => setThreats(e.target.value)}
            placeholder="Your assessment..."
            rows={2}
          />
        </div>

        <div className="reflection-field">
          <label>How confident were you in this move?</label>
          <div className="confidence-selector">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={`confidence-btn ${confidence === n ? 'active' : ''}`}
                onClick={() => setConfidence(n)}
              >
                {n}
              </button>
            ))}
            <span className="confidence-labels">
              <span>Uncertain</span>
              <span>Very confident</span>
            </span>
          </div>
        </div>
      </div>

      {skipWarning && (
        <div className="skip-warning">{skipWarning}</div>
      )}

      <div className="reflection-actions">
        <button className="reflection-submit" onClick={handleSubmit}>
          Reveal Analysis
        </button>
        <button className="reflection-skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  );
}

function ReflectionStatus({ state }) {
  const { currentMoveIndex, analysisRevealed, criticalMoments, criticalMoveList,
    fullAnalysisRunning, fullAnalysisProgress, fullAnalysisTotal, phase } = state;

  if (fullAnalysisRunning) {
    return (
      <div className="reflection-panel reflection-empty">
        <div className="analysis-running">
          <div className="spinner" />
          <span>Analyzing game... {fullAnalysisProgress}/{fullAnalysisTotal} positions</span>
          <div className="analysis-progress-bar">
            <div
              className="analysis-progress-fill"
              style={{ width: `${fullAnalysisTotal ? (fullAnalysisProgress / fullAnalysisTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentMoveIndex === 0) {
    return (
      <div className="reflection-panel reflection-empty">
        <div className="empty-state">
          <span className="empty-icon">&#9654;</span>
          <p>Navigate through the game to begin.</p>
          <p className="empty-hint">Use arrow keys or click moves in the list.</p>
        </div>
      </div>
    );
  }

  const isCritical = !!criticalMoments[currentMoveIndex];

  if (phase === 'deep_review' && isCritical && analysisRevealed[currentMoveIndex]) {
    return (
      <div className="reflection-panel reflection-empty">
        <div className="empty-state">
          <span className="empty-icon">&#10003;</span>
          <p>You've reviewed this critical moment.</p>
          <p className="empty-hint">Check the Engine tab, or navigate to the next critical moment.</p>
        </div>
      </div>
    );
  }

  if (phase === 'deep_review' && !isCritical) {
    return (
      <div className="reflection-panel reflection-empty">
        <div className="empty-state">
          <p>This isn't a critical moment.</p>
          <p className="empty-hint">Use the "Next" / "Prev" buttons in the banner to jump between critical positions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reflection-panel reflection-empty">
      <div className="empty-state">
        <p>Navigate to a move to continue.</p>
      </div>
    </div>
  );
}
