import { createWidget, WidgetConfig, WidgetInstance } from './createWidget';

declare global {
  interface Window {
    VSBRuntime?: {
      mount: (container: HTMLElement | string, config: WidgetConfig) => WidgetInstance;
    };
  }
}

export function mount(
  container: HTMLElement | string,
  config: WidgetConfig
): WidgetInstance {
  return createWidget(container, config);
}

// Auto-expose to window for UMD builds
if (typeof window !== 'undefined') {
  window.VSBRuntime = { mount };
}
