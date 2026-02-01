import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WizardRunner } from '../runtime/WizardRunner';

export interface WidgetConfig {
  wizardId: string;
  version?: string;
  sessionId?: string;
  prefillData?: Record<string, unknown>;
  onComplete?: (data: unknown) => void;
  onError?: (error: Error) => void;
  onStepChange?: (stepId: string) => void;
}

export interface WidgetInstance {
  destroy: () => void;
  restart: () => void;
  getState: () => unknown;
}

export function createWidget(
  container: HTMLElement | string,
  config: WidgetConfig
): WidgetInstance {
  const element =
    typeof container === 'string'
      ? document.querySelector<HTMLElement>(container)
      : container;

  if (!element) {
    throw new Error(`Container not found: ${container}`);
  }

  let root: Root | null = createRoot(element);

  const render = () => {
    if (!root) return;

    root.render(
      React.createElement(WizardRunner, {
        wizardId: config.wizardId,
        version: config.version,
        sessionId: config.sessionId,
        prefillData: config.prefillData,
        onComplete: config.onComplete,
        onError: config.onError,
        onStepChange: config.onStepChange,
      })
    );
  };

  render();

  return {
    destroy: () => {
      if (root) {
        root.unmount();
        root = null;
      }
    },
    restart: () => {
      if (root) {
        render();
      }
    },
    getState: () => {
      // TODO: Expose state from WizardRunner
      return {};
    },
  };
}
