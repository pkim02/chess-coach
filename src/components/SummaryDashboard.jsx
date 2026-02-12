import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useGame } from '../context/GameContext';
import { MOVE_CLASSIFICATIONS } from '../utils/constants';
import { computeAccuracy, computeMetacognitionScore } from '../utils/chess';
import { getGameSummary } from '../utils/anthropic';
import { getApiKey, saveJournalEntry } from '../utils/storage';
import { extractTakeaways } from '../utils/journal';

export default function SummaryDashboard() {
  const { state, dispatch } = useGame();
  const { gameData, analyses, reflections, history, skipCount, totalReflections } = state;
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);

  // Compute classifications array
  const classifications = useMemo(() => {
    return history.map((_, i) => analyses[i + 1]?.classification).filter(Boolean);
  }, [history, analyses]);

  // Classification counts
  const classificationCounts = useMemo(() => {
    const counts = {};
    classifications.forEach(c => {
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [classifications]);

  // Accuracy
  const accuracy = useMemo(() => computeAccuracy(classifications), [classifications]);

  // Metacognition score
  const metacogScore = useMemo(() => {
    const refs = history.map((_, i) => reflections[i + 1]);
    const anals = history.map((_, i) => analyses[i + 1]);
    return computeMetacognitionScore(refs, anals);
  }, [history, reflections, analyses]);

  // Detect patterns
  const patterns = useMemo(() => {
    const result = [];
    const blunders = classificationCounts.blunder || 0;
    const mistakes = classificationCounts.mistake || 0;
    const inaccuracies = classificationCounts.inaccuracy || 0;

    if (blunders >= 2) {
      result.push({ icon: '!', text: `${blunders} blunders detected. Consider slowing down and checking for opponent threats before each move.` });
    }
    if (mistakes >= 3) {
      result.push({ icon: '?', text: `${mistakes} mistakes across the game. Focus on calculating one move deeper before committing.` });
    }
    if (inaccuracies >= 4) {
      result.push({ icon: '~', text: `${inaccuracies} inaccuracies suggest positional understanding could be improved. Study typical pawn structures.` });
    }
    if (skipCount > totalReflections * 0.5 && totalReflections > 0) {
      result.push({ icon: '!', text: `You skipped reflection on ${skipCount} moves. Self-analysis is the most powerful learning tool.` });
    }
    if (accuracy >= 85) {
      result.push({ icon: '+', text: 'Strong overall accuracy. Focus on the few critical moments where precision slipped.' });
    }
    if (metacogScore >= 70) {
      result.push({ icon: '+', text: 'Your self-awareness was strong. You correctly identified many of the key positions.' });
    } else if (metacogScore < 40 && totalReflections > 3) {
      result.push({ icon: '!', text: 'Your stated reasoning often diverged from the engine. Practice verbalizing your thought process during games.' });
    }

    return result;
  }, [classificationCounts, accuracy, metacogScore, skipCount, totalReflections]);

  // AI summary
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const apiKey = await getApiKey();
      if (cancelled) return;
      if (!apiKey) {
        setAiSummary('Add your Anthropic API key in Settings to get personalized improvement suggestions.');
        return;
      }

      setLoadingAi(true);
      const cls = history.map((_, i) => analyses[i + 1]?.classification);
      const refs = history.map((_, i) => reflections[i + 1]);

      try {
        const text = await getGameSummary(apiKey, gameData, refs, history.map((_, i) => analyses[i + 1]), cls);
        if (!cancelled) setAiSummary(text);
      } catch { /* ignore */ }
      if (!cancelled) setLoadingAi(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSaveToJournal = async () => {
    const takeaways = extractTakeaways(analyses, reflections, history);
    const entry = {
      id: uuidv4(),
      gameId: state.gameId,
      date: new Date().toISOString(),
      white: gameData?.white || 'White',
      black: gameData?.black || 'Black',
      result: gameData?.result || '*',
      accuracy,
      metacogScore,
      takeaways,
      patterns: patterns.map(p => p.text),
      userNotes: '',
    };
    await saveJournalEntry(entry);
    setJournalSaved(true);
  };

  const accuracyClass = accuracy >= 80 ? 'good' : accuracy >= 60 ? 'okay' : 'bad';
  const metacogClass = metacogScore >= 70 ? 'good' : metacogScore >= 40 ? 'okay' : 'bad';

  const totalMoves = classifications.length;
  const maxCount = Math.max(...Object.values(classificationCounts), 1);

  return (
    <div className="summary-screen">
      <div className="summary-header">
        <h2>Game Review Summary</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="summary-back-btn"
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'analysis' })}
          >
            Back to Analysis
          </button>
          <button
            className="summary-back-btn"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            New Game
          </button>
          <button
            className="summary-back-btn"
            onClick={handleSaveToJournal}
            disabled={journalSaved}
            style={journalSaved ? { opacity: 0.7 } : {}}
          >
            {journalSaved ? 'Saved to Journal' : 'Save to Journal'}
          </button>
        </div>
      </div>

      <div className="summary-grid">
        {/* Accuracy card */}
        <div className="summary-card">
          <h3>Accuracy</h3>
          <div className={`big-number ${accuracyClass}`}>{accuracy}%</div>
          <div className="subtitle">
            {gameData?.white} vs {gameData?.black}
          </div>
        </div>

        {/* Metacognition card */}
        <div className="summary-card">
          <h3>Metacognition Score</h3>
          <div className={`big-number ${metacogClass}`}>{metacogScore}</div>
          <div className="subtitle">
            How well your reasoning matched reality
          </div>
        </div>

        {/* Stats card */}
        <div className="summary-card">
          <h3>Review Stats</h3>
          <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-secondary)' }}>
            <div>Moves analyzed: <strong>{totalMoves}</strong></div>
            <div>Reflections: <strong>{totalReflections - skipCount}</strong></div>
            <div>Skipped: <strong>{skipCount}</strong></div>
          </div>
        </div>

        {/* Classification breakdown */}
        <div className="summary-card">
          <h3>Move Classification</h3>
          <div className="classification-breakdown">
            {Object.entries(MOVE_CLASSIFICATIONS).map(([key, info]) => {
              const count = classificationCounts[key] || 0;
              if (count === 0 && !['brilliant', 'best', 'good', 'inaccuracy', 'mistake', 'blunder'].includes(key)) return null;
              return (
                <div key={key} className="classification-row">
                  <span
                    className="classification-dot"
                    style={{ backgroundColor: info.color }}
                  />
                  <span style={{ minWidth: 70 }}>{info.label}</span>
                  <div className="classification-bar-bg">
                    <div
                      className="classification-bar-fill"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: info.color,
                      }}
                    />
                  </div>
                  <span className="classification-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className="summary-card" style={{ marginBottom: 16 }}>
          <h3>Patterns Detected</h3>
          <div className="patterns-list">
            {patterns.map((p, i) => (
              <div key={i} className="pattern-item">
                <span className="pattern-icon">{p.icon}</span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="ai-insights">
        <h3>
          <span>&#9733;</span> Personalized Coaching Insights
        </h3>
        {loadingAi ? (
          <div className="ai-insights-loading">
            <div className="spinner" />
            Generating personalized analysis...
          </div>
        ) : (
          <div className="ai-insights-content">{aiSummary}</div>
        )}
      </div>
    </div>
  );
}
