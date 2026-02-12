import { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { SAMPLE_GAMES } from '../utils/constants';
import { getGames, deleteGame } from '../utils/storage';

export default function ImportScreen() {
  const { loadGame, dispatch } = useGame();
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState('');
  const [pastGames, setPastGames] = useState([]);
  const fileRef = useRef(null);

  // Load past games asynchronously
  useEffect(() => {
    getGames().then(setPastGames);
  }, []);


  const handleImport = () => {
    if (!pgn.trim()) {
      setError('Please paste a PGN game.');
      return;
    }
    try {
      loadGame(pgn.trim());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setPgn(text);
    };
    reader.readAsText(file);
  };

  const handleSampleGame = (samplePgn) => {
    try {
      loadGame(samplePgn);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleLoadPastGame = (game) => {
    dispatch({
      type: 'LOAD_SAVED_GAME',
      payload: {
        gameId: game.id,
        gameData: game.gameData,
        positions: game.gameData.positions,
        history: game.gameData.history,
        analyses: game.analyses || {},
        reflections: game.reflections || {},
        criticalMoments: game.criticalMoments || {},
        criticalMoveList: game.criticalMoveList || [],
        analysisRevealed: game.analysisRevealed || {},
        skipCount: game.skipCount || 0,
        totalReflections: game.totalReflections || 0,
        phase: game.phase || 'first_pass',
      },
    });
  };

  const handleDeletePastGame = async (e, id) => {
    e.stopPropagation();
    await deleteGame(id);
    setPastGames(await getGames());
  };

  return (
    <div className="import-screen">
      <h2>Chess Coach</h2>
      <p>Import a game and develop deeper chess understanding through guided self-reflection.</p>

      <div className="import-box">
        <h3>Paste PGN</h3>
        <textarea
          className="pgn-textarea"
          value={pgn}
          onChange={(e) => { setPgn(e.target.value); setError(''); }}
          placeholder={`[Event "Casual Game"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6...`}
        />
        <div className="import-actions">
          <button
            className="import-btn import-btn-primary"
            onClick={handleImport}
            disabled={!pgn.trim()}
          >
            Analyze Game
          </button>
        </div>
        {error && <div className="import-error">{error}</div>}

        <div className="import-divider">or</div>

        <div
          className="file-upload-zone"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pgn,.txt"
            onChange={handleFileUpload}
          />
          Click to upload a .pgn file
        </div>

        <div className="sample-games">
          <h4>Or try a famous game:</h4>
          {SAMPLE_GAMES.map((game, idx) => (
            <button
              key={idx}
              className="sample-game-btn"
              onClick={() => handleSampleGame(game.pgn)}
            >
              {game.label}
            </button>
          ))}
        </div>
      </div>

      {pastGames.length > 0 && (
        <div className="past-games">
          <h3>Previously Analyzed Games</h3>
          <div className="past-games-list">
            {pastGames.map((game) => (
              <div
                key={game.id}
                className="past-game-item"
                onClick={() => handleLoadPastGame(game)}
              >
                <div className="past-game-info">
                  <span className="past-game-players">
                    {game.gameData?.white || '?'} vs {game.gameData?.black || '?'}
                  </span>
                  <span className="past-game-date">
                    {game.date ? new Date(game.date).toLocaleDateString() : ''}
                  </span>
                </div>
                <button
                  className="past-game-delete"
                  onClick={(e) => handleDeletePastGame(e, game.id)}
                  title="Delete game"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
