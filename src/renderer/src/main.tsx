import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('root 要素が見つかりません');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
