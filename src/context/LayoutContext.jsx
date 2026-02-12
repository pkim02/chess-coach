import { createContext, useContext } from 'react';

const LayoutContext = createContext({ mode: 'full' });

export function LayoutProvider({ mode, children }) {
  return (
    <LayoutContext.Provider value={{ mode }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
