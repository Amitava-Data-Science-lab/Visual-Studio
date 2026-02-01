import React from 'react';
import ReactDOM from 'react-dom/client';
import { WizardRunner } from './runtime/WizardRunner';
import './styles/index.css';

// Demo/development entry point
const params = new URLSearchParams(window.location.search);
const wizardId = params.get('wizardId') || 'demo';
const sessionId = params.get('sessionId') || undefined;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WizardRunner wizardId={wizardId} sessionId={sessionId} />
  </React.StrictMode>
);
