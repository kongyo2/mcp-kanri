import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrapInitialLocale, I18nProvider } from './i18n';
import { resolveLocale, translate } from '../../shared/i18n';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  // I18nProvider が無い段階のため、ブラウザ言語から推定したロケールで翻訳する。
  throw new Error(translate(resolveLocale(window.navigator.language), 'bootstrap.rootMissing'));
}

// React の effect は子から親の順に走るため、I18nProvider 内で setLocale すると
// App が `kanri.list()` を投げた後にロケールが届く。起動直後に破損ストアが
// 検出されると、エラーメッセージが UI 言語と異なるロケールで返ってくるため、
// render 前に IPC キューへ setLocale を積んでおく。
const initialLocale = bootstrapInitialLocale();

createRoot(rootElement).render(
  <React.StrictMode>
    <I18nProvider initialLocale={initialLocale}>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
