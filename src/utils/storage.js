const GAMES_KEY = 'chess-coach-games';
const API_KEY_KEY = 'chess-coach-api-key';
const SETTINGS_KEY = 'chess-coach-settings';
const JOURNAL_KEY = 'chess-coach-journal';

function getJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function saveGame(gameData) {
  const games = await getGames();
  const existing = games.findIndex(g => g.id === gameData.id);
  if (existing >= 0) {
    games[existing] = gameData;
  } else {
    games.unshift(gameData);
  }
  // Keep max 50 games
  setJson(GAMES_KEY, games.slice(0, 50));
}

export async function getGames() {
  return getJson(GAMES_KEY, []);
}

export async function deleteGame(id) {
  const games = (await getGames()).filter(g => g.id !== id);
  setJson(GAMES_KEY, games);
}

export async function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_KEY) || '';
  } catch {
    return '';
  }
}

export async function setApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key);
}

export async function getSettings() {
  return getJson(SETTINGS_KEY, {});
}

export async function setSettings(settings) {
  setJson(SETTINGS_KEY, settings);
}

// Journal CRUD

export async function getJournalEntries() {
  return getJson(JOURNAL_KEY, []);
}

export async function saveJournalEntry(entry) {
  const entries = await getJournalEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  setJson(JOURNAL_KEY, entries.slice(0, 100));
}

export async function deleteJournalEntry(id) {
  const entries = (await getJournalEntries()).filter(e => e.id !== id);
  setJson(JOURNAL_KEY, entries);
}

export async function updateJournalEntryNotes(id, userNotes) {
  const entries = await getJournalEntries();
  const entry = entries.find(e => e.id === id);
  if (entry) {
    entry.userNotes = userNotes;
    setJson(JOURNAL_KEY, entries);
  }
}
