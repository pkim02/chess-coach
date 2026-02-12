/**
 * Pure Stockfish engine wrapper - no React dependencies.
 * Used by: useStockfish.js (React hook wrapper), offscreen/offscreen.js (raw)
 */
export class StockfishEngine {
  constructor(workerUrl) {
    this.worker = null;
    this.workerUrl = workerUrl;
    this.isReady = false;
    this.lines = {};
    this.pendingResolve = null;
    this.onReady = null;
    this.onAnalyzing = null;
  }

  init() {
    return new Promise((resolve) => {
      this.worker = new Worker(this.workerUrl);
      let engineReady = false;

      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : '';

        if (line === 'uciok') {
          this.worker.postMessage('setoption name Threads value 1');
          this.worker.postMessage('setoption name Hash value 32');
          this.worker.postMessage('isready');
          return;
        }

        if (line === 'readyok' && !engineReady) {
          engineReady = true;
          this.isReady = true;
          this.onReady?.();
          resolve();
          return;
        }

        if (line.startsWith('info') && line.includes('score') && line.includes(' pv ')) {
          const parsed = parseInfoLine(line);
          if (parsed && parsed.multipv) {
            this.lines[parsed.multipv] = parsed;
          }
        }

        if (line.startsWith('bestmove')) {
          const bestMoveUci = line.split(' ')[1];
          this.onAnalyzing?.(false);
          if (this.pendingResolve) {
            this.pendingResolve({ bestMoveUci, lines: { ...this.lines } });
            this.pendingResolve = null;
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('Stockfish worker error:', err);
      };

      this.worker.postMessage('uci');
    });
  }

  analyzeRaw(fen, depth, multipv) {
    return new Promise((resolve) => {
      if (!this.worker || !this.isReady) {
        resolve(null);
        return;
      }
      this.lines = {};
      this.pendingResolve = resolve;
      this.onAnalyzing?.(true);
      this.worker.postMessage('stop');
      this.worker.postMessage(`setoption name MultiPV value ${multipv}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  stop() {
    this.worker?.postMessage('stop');
  }

  destroy() {
    this.worker?.postMessage('quit');
    this.worker?.terminate();
    this.worker = null;
  }
}

function parseInfoLine(line) {
  const tokens = line.split(' ');
  const result = {};

  for (let i = 0; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'depth':
        result.depth = parseInt(tokens[i + 1]);
        break;
      case 'seldepth':
        result.seldepth = parseInt(tokens[i + 1]);
        break;
      case 'multipv':
        result.multipv = parseInt(tokens[i + 1]);
        break;
      case 'score':
        if (tokens[i + 1] === 'cp') {
          result.score = parseInt(tokens[i + 2]);
          result.scoreType = 'cp';
        } else if (tokens[i + 1] === 'mate') {
          result.score = parseInt(tokens[i + 2]);
          result.scoreType = 'mate';
        }
        break;
      case 'nodes':
        result.nodes = parseInt(tokens[i + 1]);
        break;
      case 'nps':
        result.nps = parseInt(tokens[i + 1]);
        break;
      case 'pv':
        result.pv = tokens.slice(i + 1).join(' ');
        break;
    }
  }

  return result;
}
