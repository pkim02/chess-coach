import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLayout } from '../context/LayoutContext';
import ImportScreen from './ImportScreen';
import AnalysisView from './AnalysisView';
import SummaryDashboard from './SummaryDashboard';
import JournalView from './JournalView';
import SettingsModal from './SettingsModal';
import PopoutButton from './PopoutButton';

export default function AppContent() {
  const { state, dispatch } = useGame();
  const { mode } = useLayout();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className={`app ${mode === 'compact' ? 'app--compact' : 'app--full'}`}>
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            Chess<span>Coach</span>
          </div>
        </div>
        <div className="app-header-right">
          <button
            className={`header-btn ${state.view === 'journal' ? 'header-btn--active' : ''}`}
            onClick={() => dispatch({ type: 'SET_VIEW', payload: state.view === 'journal' ? 'import' : 'journal' })}
          >
            Journal
          </button>
          {mode === 'compact' && <PopoutButton />}
          <button
            className="header-btn"
            onClick={() => setShowSettings(true)}
          >
            Settings
          </button>
        </div>
      </header>

      <main className="app-main">
        {state.view === 'import' && <ImportScreen />}
        {state.view === 'analysis' && <AnalysisView />}
        {state.view === 'summary' && <SummaryDashboard />}
        {state.view === 'journal' && <JournalView />}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
