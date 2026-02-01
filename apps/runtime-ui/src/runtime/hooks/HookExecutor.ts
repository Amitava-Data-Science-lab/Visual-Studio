import type { HookDefinition } from '@/api/runtimeApi';

export interface StateUpdate {
  path: string;   // JSONPath like "$.application.quote.premium"
  value: unknown;
}

export interface HookResult {
  success: boolean;
  stateUpdates: StateUpdate[]; // Patches to apply to sessionState
  data?: unknown;              // Raw response data (for debugging)
  error?: string;
  duration: number;
}

export async function executeHook(
  hook: HookDefinition,
  _sessionState: Record<string, unknown> // Prefixed with _ - used in future implementation
): Promise<HookResult> {
  const startTime = Date.now();

  try {
    // TODO: Implement hook execution
    // 1. Build request from requestMap (extract from sessionState using getJsonPath)
    // 2. Call endpoint
    // 3. Parse responseMap into StateUpdate[] patches

    console.log('[Hook Stub] Would execute:', hook.id, hook.endpoint);

    return {
      success: true,
      stateUpdates: [], // v0: stubbed, no updates
      data: { stubbed: true },
      duration: Date.now() - startTime
    };
  } catch (err) {
    return {
      success: false,
      stateUpdates: [],
      error: (err as Error).message,
      duration: Date.now() - startTime
    };
  }
}

// Execute multiple hooks in sequence (for onEnter/onSubmit)
// Returns aggregated state updates to apply
export async function executeStepHooks(
  hooks: HookDefinition[],
  sessionState: Record<string, unknown>
): Promise<StateUpdate[]> {
  const allUpdates: StateUpdate[] = [];

  for (const hook of hooks) {
    const result = await executeHook(hook, sessionState);

    if (!result.success) {
      throw new Error(`Hook ${hook.id} failed: ${result.error}`);
    }

    console.log(`[Hook] ${hook.id} completed in ${result.duration}ms`);
    allUpdates.push(...result.stateUpdates);
  }

  return allUpdates;
}
