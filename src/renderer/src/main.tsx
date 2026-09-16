import React from 'react';
import { createRoot } from 'react-dom/client';
import { resolveLocale, translate } from '../../shared/i18n';
import { Root } from './Root';
import { createBrowserPorts } from './mvp/ports';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error(translate(resolveLocale(window.navigator.language), 'bootstrap.rootMissing'));
}

createRoot(rootElement).render(
  <React.StrictMode>
    <Root ports={createBrowserPorts()} />
  </React.StrictMode>,
);
