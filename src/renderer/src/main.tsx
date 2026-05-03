import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './i18n';
import { resolveLocale, translate } from '../../shared/i18n';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  // I18nProvider が無い段階のため、ブラウザ言語から推定したロケールで翻訳する。
  throw new Error(translate(resolveLocale(window.navigator.language), 'bootstrap.rootMissing'));
}

createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
