export interface WizardStep {
  id: string;
  title?: string;
  pageRef?: string;
  fields?: unknown[];
  next?: unknown[]; // For future conditional routing
}

// v0: Simple linear navigation
export function getNextStepIdLinear(
  steps: WizardStep[],
  currentStepId: string
): string | null {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return null; // No next step
  }

  return steps[currentIndex + 1].id;
}

// v0: Check if current step is last
export function isLastStep(steps: WizardStep[], currentStepId: string): boolean {
  return getNextStepIdLinear(steps, currentStepId) === null;
}

// v0: Check if can go back
export function canGoBack(stepHistory: string[]): boolean {
  return stepHistory.length > 0;
}

// Future: Conditional routing (not implemented in v0)
export function getNextStepIdConditional(
  _wizard: unknown,
  _currentStepId: string,
  _sessionState: unknown
): string | null {
  // TODO: Evaluate next[] conditions
  throw new Error('Conditional routing not implemented');
}
