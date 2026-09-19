import { createContext, useContext, useEffect, useState } from 'react';

const UI_SIZE_KEY = 'narmax:ui-size';
const CARD_STYLE_KEY = 'narmax:card-style';

const PreferencesContext = createContext({
  uiSize: 'normal',
  setUiSize: () => {},
  cardStyle: 'posters',
  setCardStyle: () => {},
});

function applyUiSize(size) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('ui-small', 'ui-normal', 'ui-large');
  root.classList.add(`ui-${size}`);
}

export function PreferencesProvider({ children }) {
  const [uiSize, setUiSizeState] = useState(() => {
    try {
      return localStorage.getItem(UI_SIZE_KEY) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [cardStyle, setCardStyleState] = useState(() => {
    try {
      return localStorage.getItem(CARD_STYLE_KEY) || 'posters';
    } catch {
      return 'posters';
    }
  });

  const setUiSize = (size) => {
    setUiSizeState(size);
    try {
      localStorage.setItem(UI_SIZE_KEY, size);
    } catch {}
    applyUiSize(size);
  };

  const setCardStyle = (style) => {
    setCardStyleState(style);
    try {
      localStorage.setItem(CARD_STYLE_KEY, style);
    } catch {}
  };

  useEffect(() => {
    applyUiSize(uiSize);
  }, [uiSize]);

  return (
    <PreferencesContext.Provider value={{ uiSize, setUiSize, cardStyle, setCardStyle }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
