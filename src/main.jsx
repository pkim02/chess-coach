import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameProvider } from './context/GameContext';
import { LayoutProvider } from './context/LayoutContext';
import AppContent from './components/AppContent';
import './styles/index.css';
import './styles/App.css';
import './styles/compact.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LayoutProvider mode="compact">
      <GameProvider>
        <AppContent />
      </GameProvider>
    </LayoutProvider>
  </StrictMode>
);
