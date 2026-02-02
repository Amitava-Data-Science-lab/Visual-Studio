import { create } from 'zustand';
import { runtimeApi, type WizardDefinition, type PageDefinition } from '@/api/runtimeApi';
import { loadWizardPages } from '../loaders/pageLoader';
import { getJsonPath, setJsonPath } from '../jsonpath';
import { getNextStepIdLinear } from '../routing/getNextStepId';
import type { StateUpdate } from '../hooks/HookExecutor';

interface WizardState {
  // Definition state (immutable)
  wizard: WizardDefinition | null;
  pages: Record<string, PageDefinition>;

  // Session state (mutable)
  sessionId: string | null;
  currentStep: string | null;
  stepHistory: string[];
  sessionState: {
    application: Record<string, unknown>; // User data (binds use $.application.*)
    context?: Record<string, unknown>; // Runtime metadata (optional)
  };
  isLoading: boolean;
  error: string | null;

  // Actions
  loadWizard: (wizardKey: string, version?: string) => Promise<void>;
  loadPages: (pages: Record<string, PageDefinition>) => void;
  createSession: (prefillData?: Record<string, unknown>) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: () => Promise<void>;
  setStateAtPath: (path: string, value: unknown) => void;  // Renamed from setApplicationData
  getStateAtPath: (path: string) => unknown;                // Renamed from getApplicationData
  applyStateUpdates: (updates: StateUpdate[]) => void;      // Batched updates from hooks
  goToStep: (stepId: string) => void;
  goNext: () => void;
  goBack: () => void;
}

export const useWizardStore = create<WizardState>((set, get) => ({
  wizard: null,
  pages: {},
  sessionId: null,
  currentStep: null,
  stepHistory: [],
  sessionState: {
    application: {},
    context: {}
  },
  isLoading: false,
  error: null,

  loadWizard: async (wizardKey: string, version?: string) => {
    set({ isLoading: true, error: null });
    try {
      const wizard = version
        ? await runtimeApi.loadWizardVersion(wizardKey, version)
        : await runtimeApi.loadWizard(wizardKey);

      const pages = await loadWizardPages(wizard);

      set({
        wizard,
        pages,
        currentStep: wizard.definition.steps[0]?.id || null,
        isLoading: false
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadPages: (pages: Record<string, PageDefinition>) => {
    set({ pages });
  },

  createSession: async (prefillData) => {
    const { wizard } = get();
    if (!wizard) throw new Error('No wizard loaded');

    try {
      const session = await runtimeApi.createSession(
        wizard.wizard_key,
        wizard.version, // Pass version (string like "v1")
        prefillData
      );
      set({
        sessionId: session.session_id,
        sessionState: session.state
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      const session = await runtimeApi.loadSession(sessionId);
      set({
        sessionId: session.session_id,
        sessionState: session.state,
        currentStep: session.current_step ?? null,  // Restore step for resume
        stepHistory: []  // Reset history on resume
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveSession: async () => {
    const { sessionId, sessionState, currentStep } = get();
    if (!sessionId) return; // No session to save

    try {
      await runtimeApi.updateSession(sessionId, sessionState, currentStep || undefined);
    } catch (err) {
      console.error('Failed to save session:', err);
      // Don't block UI on save failure
    }
  },

  // CRITICAL: Use sessionState as root, not sessionState.application
  setStateAtPath: (path: string, value: unknown) => {
    set((state) => ({
      sessionState: setJsonPath(state.sessionState, path, value) as WizardState['sessionState']
    }));
  },

  getStateAtPath: (path: string) => {
    const { sessionState } = get();
    return getJsonPath(sessionState, path);  // Pass full sessionState as root
  },

  applyStateUpdates: (updates: StateUpdate[]) => {
    set((state) => {
      let newSessionState = state.sessionState;
      for (const update of updates) {
        newSessionState = setJsonPath(newSessionState, update.path, update.value) as WizardState['sessionState'];
      }
      return { sessionState: newSessionState };
    });
  },

  goToStep: (stepId: string) => {
    const { currentStep, stepHistory } = get();
    if (!currentStep) {
      // First step load
      set({ currentStep: stepId });
      return;
    }

    // Push current step to history before navigating
    set({
      currentStep: stepId,
      stepHistory: [...stepHistory, currentStep]
    });
  },

  goNext: async () => {
    const { currentStep, wizard, sessionId, sessionState } = get();
    if (!wizard || !currentStep) return;

    // TODO: Execute onSubmit hooks here (block if failed)
    // const stateUpdates = await executeStepHooks(step.onSubmit, sessionState);
    // Apply updates...

    // Compute next step
    const nextStepId = getNextStepIdLinear(wizard.definition.steps, currentStep);
    if (!nextStepId) {
      // Last step - trigger onComplete
      // TODO: Call onComplete callback
      return;
    }

    // Navigate to next step (updates history)
    get().goToStep(nextStepId);

    // Save with the NEW current_step (so resume works correctly)
    if (sessionId) {
      try {
        await runtimeApi.updateSession(sessionId, sessionState, nextStepId);
      } catch (err) {
        console.error('Failed to save session during navigation:', err);
        // Don't block navigation on save failure
      }
    }
  },

  goBack: () => {
    const { stepHistory } = get();
    if (stepHistory.length === 0) return; // Can't go back from first step

    // Pop last step from history
    const previousStep = stepHistory[stepHistory.length - 1];
    const newHistory = stepHistory.slice(0, -1);

    set({
      currentStep: previousStep,
      stepHistory: newHistory
    });

    // Optional: persist current_step on back navigation too
    // get().saveSession();
  }
}));
