import { useEffect } from 'react';
import { useWizardStore } from './state/wizardStore';
import { FieldRegistry } from './FieldRegistry';
import { isLastStep, canGoBack } from './routing/getNextStepId';
import { getJsonPath } from './jsonpath';
import { executeStepHooks } from './hooks/HookExecutor';

export function StepRouter() {
  const {
    wizard,
    pages,
    currentStep,
    sessionState,
    stepHistory,
    setStateAtPath,  // Renamed from setApplicationData
    applyStateUpdates,  // Batched updates
    goNext,
    goBack
  } = useWizardStore();

  // Execute onEnter hooks when step changes
  useEffect(() => {
    if (!currentStep || !wizard) return;

    const step = wizard.definition.steps.find((s) => s.id === currentStep);
    if (!step) return;

    // Execute onEnter hooks (stubbed for now, but wired for state updates)
    if (step.onEnter && step.onEnter.length > 0) {
      const { sessionState } = useWizardStore.getState();  // Read once, no dependency
      executeStepHooks(step.onEnter, sessionState)
        .then((stateUpdates) => {
          // Apply hook state updates in one batch
          applyStateUpdates(stateUpdates);
        })
        .catch((err) => {
          console.error('onEnter hook failed:', err);
          // Could show error UI or block step
        });
    }
  }, [currentStep, wizard, applyStateUpdates]);  // No sessionState dependency

  if (!wizard || !currentStep) return null;

  const step = wizard.definition.steps.find((s) => s.id === currentStep);
  if (!step) return <div>Step not found</div>;

  // Get fields from pageRef or inline
  const fields = step.pageRef
    ? pages[step.pageRef]?.definition.fields || []
    : step.fields || [];

  // Title fallback chain
  const stepTitle =
    step.title ??
    (step.pageRef ? pages[step.pageRef]?.definition.title : null) ??
    wizard.definition.name ??
    'Untitled Step';

  const steps = wizard.definition.steps;

  return (
    <div className="vsb-step">
      <header className="vsb-step__header">
        <h2>{stepTitle}</h2>
      </header>

      <div className="vsb-step__fields">
        {fields.map((field) => (
          <FieldRegistry
            key={field.id}
            field={field}
            // CRITICAL: Use sessionState as root (not sessionState.application)
            // Direct JSONPath access (reactive because sessionState is from store)
            value={getJsonPath(sessionState, field.bind)}
            onChange={(value) => setStateAtPath(field.bind, value)}
          />
        ))}
      </div>

      <footer className="vsb-step__actions">
        {canGoBack(stepHistory) && (
          <button type="button" onClick={goBack} className="vsb-btn vsb-btn--secondary">
            Back
          </button>
        )}
        <button type="button" onClick={goNext} className="vsb-btn vsb-btn--primary">
          {isLastStep(steps, currentStep) ? 'Complete' : 'Next'}
        </button>
      </footer>

      <div className="vsb-step__progress">
        Step {steps.findIndex((s) => s.id === currentStep) + 1} of {steps.length}
      </div>
    </div>
  );
}
