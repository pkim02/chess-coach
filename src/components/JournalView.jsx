import { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { getJournalEntries, updateJournalEntryNotes, deleteJournalEntry } from '../utils/storage';
import { computeJournalPatterns } from '../utils/journal';
import './JournalView.css';

export default function JournalView() {
  const { dispatch } = useGame();
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJournalEntries().then(e => {
      setEntries(e);
      setLoading(false);
    });
  }, []);

  const patterns = useMemo(() => computeJournalPatterns(entries), [entries]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(e =>
      e.white?.toLowerCase().includes(q) ||
      e.black?.toLowerCase().includes(q) ||
      e.date?.includes(q) ||
      e.takeaways?.some(t => t.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const handleDeleteEntry = async (e, id) => {
    e.stopPropagation();
    await deleteJournalEntry(id);
    setEntries(await getJournalEntries());
    if (expandedId === id) setExpandedId(null);
  };

  if (loading) {
    return (
      <div className="journal-view">
        <div className="journal-loading"><div className="spinner" /> Loading journal...</div>
      </div>
    );
  }

  return (
    <div className="journal-view">
      <div className="journal-header">
        <h2>Game Journal</h2>
        <button
          className="summary-back-btn"
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'import' })}
        >
          Back
        </button>
      </div>

      {patterns.length > 0 && (
        <div className="journal-patterns">
          <h3>Cross-Game Patterns</h3>
          <div className="journal-patterns-list">
            {patterns.map((p, i) => (
              <div key={i} className={`journal-pattern-item ${p.type}`}>
                <span className="journal-pattern-icon">
                  {p.type === 'strength' ? '+' : '!'}
                </span>
                <span>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="journal-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by player name, date, or keyword..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="journal-empty">
          {entries.length === 0
            ? 'No journal entries yet. Analyze a game and save it to your journal from the Summary screen.'
            : 'No entries match your search.'}
        </div>
      ) : (
        <div className="journal-entries">
          {filtered.map(entry => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              onDelete={(e) => handleDeleteEntry(e, entry.id)}
              onUpdateNotes={async (notes) => {
                await updateJournalEntryNotes(entry.id, notes);
                setEntries(await getJournalEntries());
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JournalEntryCard({ entry, expanded, onToggle, onDelete, onUpdateNotes }) {
  const [notes, setNotes] = useState(entry.userNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSaveNotes = async () => {
    setSaving(true);
    await onUpdateNotes(notes);
    setSaving(false);
  };

  const accuracyClass = (entry.accuracy || 0) >= 80 ? 'good' : (entry.accuracy || 0) >= 60 ? 'okay' : 'bad';
  const dateStr = entry.date ? new Date(entry.date).toLocaleDateString() : '';

  return (
    <div className={`journal-entry ${expanded ? 'expanded' : ''}`}>
      <div className="journal-entry-header" onClick={onToggle}>
        <div className="journal-entry-info">
          <span className="journal-entry-players">
            {entry.white || '?'} vs {entry.black || '?'}
          </span>
          <span className="journal-entry-meta">
            {dateStr} {entry.result && `- ${entry.result}`}
          </span>
        </div>
        <div className="journal-entry-stats">
          <span className={`journal-entry-accuracy ${accuracyClass}`}>
            {entry.accuracy ?? '?'}%
          </span>
          <button className="journal-entry-delete" onClick={onDelete} title="Delete entry">
            &#10005;
          </button>
        </div>
      </div>

      {expanded && (
        <div className="journal-entry-body">
          {entry.takeaways?.length > 0 && (
            <div className="journal-section">
              <h4>Key Takeaways</h4>
              <ul className="journal-takeaways">
                {entry.takeaways.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}

          {entry.patterns?.length > 0 && (
            <div className="journal-section">
              <h4>Patterns Detected</h4>
              <ul className="journal-takeaways">
                {entry.patterns.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}

          <div className="journal-section">
            <h4>Your Notes</h4>
            <textarea
              className="journal-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your own notes about this game..."
              rows={3}
            />
            <button
              className="journal-notes-save"
              onClick={handleSaveNotes}
              disabled={saving || notes === (entry.userNotes || '')}
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          <div className="journal-entry-footer">
            <span>Metacognition: {entry.metacogScore ?? '?'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
