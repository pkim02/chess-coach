import { Chess } from 'chess.js';
import { CENTIPAWN_THRESHOLDS, CRITICAL_MOMENT_THRESHOLD, OPENING_PHASE_HALF_MOVES } from './constants';

/**
 * Clean chess.com-style PGN annotations that chess.js can't parse.
 */
function cleanPGN(pgn) {
  let cleaned = pgn;
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/\([^()]*\)/g, '');
  }
  cleaned = cleaned.replace(/[☒☑⬜⬛▶◀⭐💎✅❌🔵🟢🟡🟠🔴]/gu, '');
  cleaned = cleaned.replace(/\$\d+/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/ {2,}/g, ' ');
  return cleaned.trim();
}

export function parsePGN(pgnText) {
  const cleaned = cleanPGN(pgnText);
  const chess = new Chess();
  try {
    chess.loadPgn(cleaned);
  } catch (e) {
    throw new Error('Invalid PGN format. Please check your game notation.');
  }

  const headers = chess.header();
  const history = chess.history({ verbose: true });

  if (history.length === 0) {
    throw new Error('No moves found in this PGN.');
  }

  const positions = [];
  const game = new Chess();

  positions.push({
    fen: game.fen(),
    moveIndex: -1,
    move: null,
    san: null,
  });

  for (let i = 0; i < history.length; i++) {
    game.move(history[i].san);
    positions.push({
      fen: game.fen(),
      moveIndex: i,
      move: history[i],
      san: history[i].san,
    });
  }

  return {
    headers,
    history,
    positions,
    pgn: pgnText,
    white: headers.White || 'White',
    black: headers.Black || 'Black',
    result: headers.Result || '*',
    event: headers.Event || '',
    date: headers.Date || '',
  };
}

/**
 * After full engine analysis is done, identify the critical moments.
 * Returns a Set of move indices that are critical and should trigger reflection.
 *
 * A move is critical if:
 * - It's past the opening phase (> OPENING_PHASE_HALF_MOVES)
 * - It has a significant eval swing (loss >= CRITICAL_MOMENT_THRESHOLD cp)
 * - OR it's a turning point where advantage changes sides
 * - OR there was a brilliant/great move (positive critical moment)
 */
export function detectCriticalMoments(analyses, totalMoves) {
  const critical = new Map(); // moveIndex -> { type: string }

  for (let i = 1; i <= totalMoves; i++) {
    const analysis = analyses[i];
    const prevAnalysis = analyses[i - 1];
    if (!analysis || !prevAnalysis) continue;

    // Skip opening phase
    if (i <= OPENING_PHASE_HALF_MOVES) continue;

    const classification = analysis.classification;
    if (!classification) continue;

    const prevEvalCp = evalToNumber(prevAnalysis.eval);
    const currEvalCp = evalToNumber(analysis.eval);
    const playerColor = i % 2 === 1 ? 'w' : 'b';

    // Compute loss from the moving player's perspective
    let lossCp;
    if (playerColor === 'w') {
      lossCp = prevEvalCp - currEvalCp;
    } else {
      lossCp = currEvalCp - prevEvalCp;
    }

    // Blunder / mistake / significant inaccuracy
    if (['blunder', 'miss'].includes(classification)) {
      critical.set(i, { type: 'blunder' });
      continue;
    }

    if (classification === 'mistake') {
      critical.set(i, { type: 'blunder' });
      continue;
    }

    // Turning point: advantage changed sides
    const prevSide = prevEvalCp > 50 ? 'w' : prevEvalCp < -50 ? 'b' : 'even';
    const currSide = currEvalCp > 50 ? 'w' : currEvalCp < -50 ? 'b' : 'even';
    if (prevSide !== currSide && prevSide !== 'even' && currSide !== 'even') {
      critical.set(i, { type: 'turning_point' });
      continue;
    }

    // Inaccuracy with large loss
    if (classification === 'inaccuracy' && lossCp >= CRITICAL_MOMENT_THRESHOLD) {
      critical.set(i, { type: 'positional' });
      continue;
    }

    // Brilliant or great moves — positive critical moments worth reflecting on
    if (['brilliant', 'great'].includes(classification)) {
      critical.set(i, { type: 'missed_tactic' });
      continue;
    }
  }

  return critical;
}

export function classifyMove(evalBefore, evalAfter, playerColor) {
  let lossCp;
  if (playerColor === 'w') {
    lossCp = evalBefore - evalAfter;
  } else {
    lossCp = evalAfter - evalBefore;
  }

  if (typeof evalBefore === 'object' || typeof evalAfter === 'object') {
    return classifyMateMove(evalBefore, evalAfter, playerColor);
  }

  if (lossCp < CENTIPAWN_THRESHOLDS.brilliant) return 'brilliant';
  if (lossCp <= CENTIPAWN_THRESHOLDS.great) return 'great';
  if (lossCp <= CENTIPAWN_THRESHOLDS.best) return 'best';
  if (lossCp <= CENTIPAWN_THRESHOLDS.excellent) return 'excellent';
  if (lossCp <= CENTIPAWN_THRESHOLDS.good) return 'good';
  if (lossCp <= CENTIPAWN_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (lossCp <= CENTIPAWN_THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}

function classifyMateMove(evalBefore, evalAfter, playerColor) {
  const beforeMate = typeof evalBefore === 'object' ? evalBefore.mate : null;
  const afterMate = typeof evalAfter === 'object' ? evalAfter.mate : null;

  if (beforeMate !== null && afterMate !== null) {
    if (playerColor === 'w') {
      if (beforeMate > 0 && afterMate > 0 && afterMate <= beforeMate) return 'best';
      if (beforeMate > 0 && afterMate > 0) return 'good';
      if (beforeMate > 0 && afterMate < 0) return 'blunder';
    } else {
      if (beforeMate < 0 && afterMate < 0 && afterMate >= beforeMate) return 'best';
      if (beforeMate < 0 && afterMate < 0) return 'good';
      if (beforeMate < 0 && afterMate > 0) return 'blunder';
    }
  }
  if (beforeMate === null && afterMate !== null) {
    if ((playerColor === 'w' && afterMate > 0) || (playerColor === 'b' && afterMate < 0)) return 'brilliant';
    return 'blunder';
  }
  if (beforeMate !== null && afterMate === null) {
    if ((playerColor === 'w' && beforeMate > 0) || (playerColor === 'b' && beforeMate < 0)) return 'mistake';
    return 'good';
  }
  return 'good';
}

export function evalToText(evalData) {
  if (!evalData && evalData !== 0) return '?';
  if (typeof evalData === 'object' && evalData.mate !== undefined) {
    return `M${Math.abs(evalData.mate)}`;
  }
  const cp = typeof evalData === 'object' ? evalData.cp : evalData;
  const val = cp / 100;
  return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
}

export function evalToNumber(evalData) {
  if (!evalData && evalData !== 0) return 0;
  if (typeof evalData === 'object' && evalData.mate !== undefined) {
    return evalData.mate > 0 ? 9999 : -9999;
  }
  return typeof evalData === 'object' ? (evalData.cp || 0) : evalData;
}

export function evalBarPercent(evalData) {
  const cp = evalToNumber(evalData);
  const percent = 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  return Math.max(2, Math.min(98, percent));
}

export function computeAccuracy(classifications) {
  const weights = {
    brilliant: 100, great: 100, best: 100, excellent: 90, good: 72,
    book: 100, inaccuracy: 40, mistake: 14, miss: 0, blunder: 0,
  };
  if (classifications.length === 0) return 0;
  const total = classifications.reduce((sum, c) => sum + (weights[c] || 50), 0);
  return Math.round(total / classifications.length);
}

export function computeMetacognitionScore(reflections, analyses) {
  if (!reflections || reflections.length === 0) return 0;

  let totalScore = 0;
  let counted = 0;

  for (let i = 0; i < reflections.length; i++) {
    const ref = reflections[i];
    const analysis = analyses[i];
    if (!ref || ref.skipped || !analysis) continue;

    let moveScore = 0;
    counted++;

    const classification = analysis.classification;
    const confidence = ref.confidence || 3;
    const isGoodMove = ['brilliant', 'great', 'best', 'excellent', 'good', 'book'].includes(classification);
    const isBadMove = ['mistake', 'blunder', 'miss'].includes(classification);

    if (isGoodMove && confidence >= 4) moveScore += 25;
    else if (isGoodMove && confidence >= 3) moveScore += 20;
    else if (isBadMove && confidence <= 2) moveScore += 15;
    else if (isBadMove && confidence >= 4) moveScore += 0;
    else moveScore += 10;

    if (ref.candidates && analysis.topMoves && analysis.topMoves[0]) {
      const bestSan = analysis.topMoves[0].san;
      if (ref.candidates.toLowerCase().includes(bestSan.toLowerCase())) {
        moveScore += 35;
      } else {
        moveScore += 5;
      }
    } else {
      moveScore += 10;
    }

    if (ref.threats && ref.threats.trim().length > 10) moveScore += 20;
    else moveScore += 5;

    if (ref.reasoning && ref.reasoning.trim().length > 10) moveScore += 20;
    else moveScore += 5;

    totalScore += moveScore;
  }

  if (counted === 0) return 0;
  return Math.round(totalScore / counted);
}
