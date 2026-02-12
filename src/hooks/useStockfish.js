import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { StockfishEngine } from '../utils/StockfishEngine';
import { STOCKFISH_DEPTH, STOCKFISH_MULTIPV } from '../utils/constants';

/**
 * Convert raw UCI Stockfish result into SAN notation.
 * Exported so overlay (content script) can also use it.
 */
export function convertUciResult(rawResult, fen, multipv) {
  const { bestMoveUci, lines: rawLines } = rawResult;
  const parsedLines = [];

  for (let pv = 1; pv <= multipv; pv++) {
    const lineData = rawLines[pv];
    if (!lineData) continue;

    const chess = new Chess(fen);
    const uciMoves = (lineData.pv || '').split(' ').filter(Boolean);
    const sanMoves = [];

    for (const uciMove of uciMoves) {
      try {
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        const result = chess.move({ from, to, promotion });
        if (result) {
          sanMoves.push(result.san);
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    let evalScore;
    if (lineData.scoreType === 'mate') {
      evalScore = { mate: lineData.score };
    } else {
      evalScore = lineData.score;
    }

    parsedLines.push({
      pv,
      depth: lineData.depth,
      score: evalScore,
      san: sanMoves[0] || '',
      sanLine: sanMoves,
      uci: uciMoves[0] || '',
    });
  }

  let bestMoveSan = '';
  if (bestMoveUci) {
    try {
      const chess = new Chess(fen);
      const from = bestMoveUci.substring(0, 2);
      const to = bestMoveUci.substring(2, 4);
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
      const result = chess.move({ from, to, promotion });
      if (result) bestMoveSan = result.san;
    } catch { /* ignore */ }
  }

  return {
    bestMove: bestMoveSan,
    bestMoveUci,
    lines: parsedLines,
    eval: parsedLines[0]?.score ?? 0,
  };
}

export function useStockfish() {
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const engineRef = useRef(null);

  useEffect(() => {
    const workerUrl = '/stockfish/stockfish.js';

    const engine = new StockfishEngine(workerUrl);
    engine.onReady = () => setIsReady(true);
    engine.onAnalyzing = (v) => setIsAnalyzing(v);
    engineRef.current = engine;
    engine.init();

    return () => engine.destroy();
  }, []);

  const analyzePosition = useCallback((fen, depth = STOCKFISH_DEPTH, multipv = STOCKFISH_MULTIPV) => {
    return new Promise(async (resolve) => {
      const engine = engineRef.current;
      if (!engine?.isReady) {
        resolve(null);
        return;
      }

      const rawResult = await engine.analyzeRaw(fen, depth, multipv);
      if (!rawResult) {
        resolve(null);
        return;
      }

      resolve(convertUciResult(rawResult, fen, multipv));
    });
  }, []);

  const stop = useCallback(() => engineRef.current?.stop(), []);

  return { isReady, isAnalyzing, analyzePosition, stop };
}
