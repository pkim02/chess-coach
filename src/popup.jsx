import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './context/GameContext';
import { LayoutProvider } from './context/LayoutContext';
import AppContent from './components/AppContent';
import './styles/index.css';
import './styles/App.css';

const params = new URLSearchParams(window.location.search);
const transferGameId = params.get('gameId');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LayoutProvider mode="full">
      <GameProvider initialGameId={transferGameId}>
        <AppContent />
      </GameProvider>
    </LayoutProvider>
  </StrictMode>
);
