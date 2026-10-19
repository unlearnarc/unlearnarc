import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n'; // initialise i18next before the app renders
import { registerPwa } from './pwa/register';

if (import.meta.env.PROD) void registerPwa().catch(() => { /* Offline installation retries on the next visit. */ });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </React.StrictMode>
);
