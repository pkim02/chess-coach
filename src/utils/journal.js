/**
 * Extract key takeaways from game analysis data.
 * Returns up to 8 concise insight strings.
 */
export function extractTakeaways(analyses, reflections, history) {
  const takeaways = [];

  for (let i = 1; i < Object.keys(analyses).length; i++) {
    const analysis = analyses[i];
    if (!analysis?.classification) continue;

    const cls = analysis.classification;
    const moveNum = Math.ceil(i / 2);
    const moveLabel = `Move ${moveNum}`;
    const reflection = reflections[i];

    if (['blunder', 'miss'].includes(cls)) {
      if (reflection && !reflection.skipped && reflection.reasoning) {
        takeaways.push(`${moveLabel}: ${cls} - thought "${reflection.reasoning.substring(0, 80)}", but engine preferred ${analysis.bestMove || 'a different move'}`);
      } else {
        takeaways.push(`${moveLabel}: ${cls} - played ${analysis.playerMove || '?'}, engine preferred ${analysis.bestMove || '?'}`);
      }
    } else if (cls === 'mistake') {
      takeaways.push(`${moveLabel}: mistake - played ${analysis.playerMove || '?'}, better was ${analysis.bestMove || '?'}`);
    } else if (['brilliant', 'great'].includes(cls)) {
      takeaways.push(`${moveLabel}: ${cls} move ${analysis.playerMove || ''}`);
    }
  }

  return takeaways.slice(0, 8);
}

/**
 * Compute recurring patterns across multiple journal entries.
 */
export function computeJournalPatterns(entries) {
  const patterns = [];
  if (entries.length < 2) return patterns;

  const totalGames = entries.length;
  const avgAccuracy = Math.round(entries.reduce((s, e) => s + (e.accuracy || 0), 0) / totalGames);
  const avgMetacog = Math.round(entries.reduce((s, e) => s + (e.metacogScore || 0), 0) / totalGames);

  // Count takeaway themes
  const allTakeaways = entries.flatMap(e => e.takeaways || []);
  const blunderCount = allTakeaways.filter(t => t.includes('blunder')).length;
  const mistakeCount = allTakeaways.filter(t => t.includes('mistake')).length;
  const brilliantCount = allTakeaways.filter(t => t.includes('brilliant')).length;

  if (avgAccuracy >= 80) {
    patterns.push({ type: 'strength', text: `Strong ${avgAccuracy}% average accuracy across ${totalGames} games.` });
  } else if (avgAccuracy < 60) {
    patterns.push({ type: 'concern', text: `Average accuracy ${avgAccuracy}% across ${totalGames} games. Focus on reducing errors.` });
  }

  if (avgMetacog >= 70) {
    patterns.push({ type: 'strength', text: `Good self-awareness (metacognition score: ${avgMetacog}).` });
  } else if (avgMetacog < 40 && totalGames >= 3) {
    patterns.push({ type: 'concern', text: `Low metacognition (${avgMetacog}) - your self-assessment often differs from engine evaluation.` });
  }

  if (blunderCount > totalGames) {
    patterns.push({ type: 'concern', text: `Averaging more than one blunder per game. Consider a "blunder check" routine.` });
  }

  if (mistakeCount > totalGames * 2) {
    patterns.push({ type: 'concern', text: `High mistake rate across games. Focus on calculating one move deeper.` });
  }

  if (brilliantCount >= totalGames) {
    patterns.push({ type: 'strength', text: `Finding brilliant moves regularly - strong tactical vision.` });
  }

  // Accuracy trend (last 5 vs earlier)
  if (entries.length >= 5) {
    const recent = entries.slice(0, 3);
    const earlier = entries.slice(-3);
    const recentAvg = recent.reduce((s, e) => s + (e.accuracy || 0), 0) / recent.length;
    const earlierAvg = earlier.reduce((s, e) => s + (e.accuracy || 0), 0) / earlier.length;
    if (recentAvg > earlierAvg + 5) {
      patterns.push({ type: 'strength', text: `Accuracy trending upward (+${Math.round(recentAvg - earlierAvg)}% in recent games).` });
    } else if (recentAvg < earlierAvg - 5) {
      patterns.push({ type: 'concern', text: `Accuracy declining (${Math.round(earlierAvg - recentAvg)}% drop in recent games).` });
    }
  }

  return patterns;
}
