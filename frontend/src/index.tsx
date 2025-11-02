import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config.ts';
import App from './App.tsx';
import reportWebVitals from './reportWebVitals.ts';
import initializeErrorHandler from './services/initializeErrorHandler.ts';

// Initialisiere den globalen ErrorHandler
initializeErrorHandler();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals(); 