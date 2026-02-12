const CHESS_COM_HOSTS = new Set(['chess.com', 'www.chess.com']);

function isChessComUrl(url) {
  try {
    const parsed = new URL(url);
    return CHESS_COM_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function extractGameId(url) {
  const match = url.match(/\/game\/(?:live|daily)\/(\d+)/i);
  return match ? match[1] : null;
}

function unescapeJsonString(value) {
  if (!value) return '';
  try {
    return JSON.parse(`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function looksLikePgn(text) {
  if (!text) return false;
  return /\b1\.\s*[A-Za-z0-9]/.test(text) || /^\s*\[Event\s+"[^"]*"\]/m.test(text);
}

function extractPgnFromText(text) {
  if (!text) return null;

  // JSON payloads sometimes include a direct pgn field.
  try {
    const data = JSON.parse(text);
    if (typeof data?.pgn === 'string' && looksLikePgn(data.pgn)) return data.pgn;
  } catch {
    // Not JSON, continue with regex extraction.
  }

  const pgnJsonMatch = text.match(/"pgn"\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (pgnJsonMatch?.[1]) {
    const pgn = unescapeJsonString(pgnJsonMatch[1]);
    if (looksLikePgn(pgn)) return pgn;
  }

  const pgnTagMatch = text.match(/\[Event\s+"[^"]*"\][\s\S]*?(?:1-0|0-1|1\/2-1\/2|\*)\s*$/m);
  if (pgnTagMatch?.[0] && looksLikePgn(pgnTagMatch[0])) return pgnTagMatch[0];

  if (looksLikePgn(text)) return text;
  return null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.text();
}

export async function importPgnFromChessComUrl(url) {
  if (!isChessComUrl(url)) {
    throw new Error('Please paste a valid Chess.com game link.');
  }

  const gameId = extractGameId(url);
  if (!gameId) {
    throw new Error('Could not find game ID in this Chess.com URL.');
  }

  const attempts = [
    `https://www.chess.com/callback/live/game/${gameId}`,
    `https://www.chess.com/callback/daily/game/${gameId}`,
    url,
  ];

  for (const attemptUrl of attempts) {
    try {
      const text = await fetchText(attemptUrl);
      const pgn = extractPgnFromText(text);
      if (pgn) return pgn;
    } catch {
      // Try next endpoint.
    }
  }

  throw new Error('Unable to import from this link. The game may be private; try downloading PGN from Chess.com and uploading it.');
}
