import React from 'react';
import { useApp } from '../../App';

export default function TitleBar() {
  const { theme, toggleTheme } = useApp();

  const handleMinimize = () => window.api.minimizeWindow();
  const handleMaximize = () => window.api.maximizeWindow();
  const handleClose = () => window.api.closeWindow();

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <span className="titlebar-logo">📝</span>
        <span className="titlebar-title">Kişisel Notlarım</span>
      </div>

      <div className="titlebar-controls">
        {/* Theme toggle */}
        <button
          className="titlebar-btn has-tooltip"
          data-tooltip={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Window controls */}
        <button className="titlebar-btn" onClick={handleMinimize} title="Küçült">
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1"/>
          </svg>
        </button>
        <button className="titlebar-btn" onClick={handleMaximize} title="Büyüt">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="0.6" y="0.6" width="8.8" height="8.8"/>
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={handleClose} title="Kapat">
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/>
            <line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
