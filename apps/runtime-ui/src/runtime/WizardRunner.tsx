import { useEffect } from 'react';
import { useWizardStore } from './state/wizardStore';
import { StepRouter } from './StepRouter';

export interface WizardRunnerProps {
  wizardId: string;
  version?: string;
  sessionId?: string;
  prefillData?: Record<string, unknown>;
  onComplete?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onStepChange?: (stepId: string) => void;
}

export function WizardRunner({
  wizardId,
  version,
  sessionId,
  prefillData,
  onComplete: _onComplete, // Will be used when wizard completes
  onError,
  onStepChange,
}: WizardRunnerProps) {
  const { loadWizard, createSession, loadSession, wizard, currentStep, error, isLoading } = useWizardStore();

  useEffect(() => {
    async function init() {
      try {
        // 1. Load wizard + pages
        await loadWizard(wizardId, version);

        // 2. Create or load session
        if (sessionId) {
          await loadSession(sessionId);
        } else {
          await createSession(prefillData);
        }
      } catch (err) {
        onError?.(err as Error);
      }
    }

    init();
  }, [wizardId, version, sessionId, loadWizard, createSession, loadSession, prefillData, onError]);

  // Notify on step changes
  useEffect(() => {
    if (currentStep) {
      onStepChange?.(currentStep);
    }
  }, [currentStep, onStepChange]);

  if (isLoading) {
    return (
      <div className="vsb-runtime vsb-runtime--loading">
        <div className="vsb-spinner" />
        <p>Loading wizard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vsb-runtime vsb-runtime--error">
        <h2>Error Loading Wizard</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!wizard) {
    return (
      <div className="vsb-runtime vsb-runtime--empty">
        <p>No wizard loaded.</p>
      </div>
    );
  }

  return (
    <div className="vsb-runtime">
      <header className="vsb-runtime__header">
        <h1>{wizard.definition.name || 'Wizard'}</h1>
      </header>

      <main className="vsb-runtime__content">
        <StepRouter />
      </main>
    </div>
  );
}
