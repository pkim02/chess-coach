export async function getMoveExplanation(apiKey, position, playerMove, bestMove, playerReasoning, evalBefore, evalAfter, classification) {
  if (!apiKey) return 'Set your Anthropic API key in Settings to get AI-powered explanations.';

  const prompt = `You are a chess coach analyzing a student's move. Be concise and insightful (3-4 sentences max).

Position (FEN): ${position}
Student played: ${playerMove} (classified as: ${classification})
Engine's best move: ${bestMove}
Eval before move: ${evalBefore} | Eval after student's move: ${evalAfter}
Student's reasoning: "${playerReasoning || 'No reasoning provided'}"

Compare their move to the engine's best move. If their reasoning was sound, acknowledge it. If they missed something, explain what in a constructive, coaching tone. Reference their stated reasoning directly. Don't just describe the moves - explain the *why* behind the engine's preference.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (e) {
    return `AI explanation unavailable: ${e.message}`;
  }
}

export async function getGameSummary(apiKey, gameData, reflections, analyses, classifications) {
  if (!apiKey) return 'Set your Anthropic API key in Settings to get AI-powered game summaries.';

  const movesSummary = analyses.map((a, i) => {
    const ref = reflections[i];
    const cls = classifications[i];
    if (!a || !cls) return null;
    return `Move ${Math.floor(i / 2) + 1}${i % 2 === 0 ? '.' : '...'} ${a.playerMove}: ${cls}${ref?.skipped ? ' (skipped reflection)' : ''}${ref?.reasoning ? ` — Student said: "${ref.reasoning.substring(0, 80)}"` : ''}`;
  }).filter(Boolean).join('\n');

  const classificationCounts = {};
  classifications.filter(Boolean).forEach(c => {
    classificationCounts[c] = (classificationCounts[c] || 0) + 1;
  });

  const prompt = `You are an expert chess coach writing a post-game review for a student. Be warm but honest. Write 4-6 bullet points covering:
1. Overall assessment of their play
2. Key moments they handled well
3. Recurring mistake patterns (if any)
4. Specific areas to study/improve
5. How well their self-assessment matched reality (metacognition)

Game: ${gameData.white} vs ${gameData.black} (${gameData.result})
Classification breakdown: ${JSON.stringify(classificationCounts)}
Skip rate: ${reflections.filter(r => r?.skipped).length}/${reflections.length} moves skipped

Move-by-move summary:
${movesSummary}

Keep each bullet point to 1-2 sentences. Be specific about chess concepts (tactics, strategy, endgame technique, etc.).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (e) {
    return `AI summary unavailable: ${e.message}`;
  }
}
