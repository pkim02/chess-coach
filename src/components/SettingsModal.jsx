import { useState, useEffect } from 'react';
import { getApiKey, setApiKey as saveApiKey } from '../utils/storage';

export default function SettingsModal({ onClose }) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApiKey().then(k => {
      setKey(k);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await saveApiKey(key.trim());
    setSaved(true);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <div className="modal-field">
          <label>Anthropic API Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false); }}
            placeholder={loading ? 'Loading...' : 'sk-ant-...'}
            disabled={loading}
          />
          <div className="hint">
            Required for AI-powered move explanations and game summaries.
            Your key is stored locally in the extension.
          </div>
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-primary" onClick={handleSave} disabled={loading}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
