const API_BASE_URL = import.meta.env.VITE_RUNTIME_API_BASE_URL || 'http://localhost:8000';

// Wrapper response for wizards (metadata + definition)
export interface WizardDefinition {
  wizard_key: string;        // "travel-embedded-uk"
  version: string;           // "v1", "v2", "draft"
  schema_version: string;    // "wizard.v1"
  checksum: string;
  created_at: string;
  definition: {              // Actual wizard JSON
    name?: string;
    steps: WizardStep[];
    // ... rest of wizard definition schema
  };
}

// Wrapper response for pages (metadata + definition)
export interface PageDefinition {
  page_key: string;          // "page.travel.selectPlan"
  version: string;           // "v1"
  schema_version: string;    // "page.v1"
  checksum: string;
  created_at: string;
  definition: {              // Actual page JSON
    title?: string;
    description?: string;
    fields: Field[];
  };
}

// Step interface (subset of wizard definition)
export interface WizardStep {
  id: string;
  title?: string;
  pageRef?: string;          // "page.travel.selectPlan@v1"
  fields?: Field[];          // Inline fields if no pageRef
  onEnter?: HookDefinition[];
  onSubmit?: HookDefinition[];
  next?: unknown[];          // For future conditional routing
}

// Field interface (subset)
export interface Field {
  id: string;
  type: string;
  label: string;
  bind: string;              // "$.application.proposer.firstName"
  required?: boolean;
  // ... other field props
}

// Hook definition (from HookExecutor)
export interface HookDefinition {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT';
  requestMap?: Record<string, string>;
  responseMap?: Record<string, string>;
}

export interface WizardBundle {
  wizard: WizardDefinition;
  pages: Record<string, PageDefinition>; // pageRef@version → PageDefinition
}

export interface SessionData {
  session_id: string;
  wizard_key: string;
  wizard_version: string; // "v1", "v2", etc. (string not number)
  status: string;  // "started", "completed", etc.
  current_step?: string;  // For resume support
  state: {
    application: Record<string, unknown>; // User data
    context?: Record<string, unknown>; // Runtime metadata
  };
  created_at: string;
  updated_at: string;  // Updated on PATCH
  expires_at: string;
}

export const runtimeApi = {
  // Load wizard (latest published)
  async loadWizard(wizardKey: string): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/latest`);
    if (!response.ok) throw new Error(`Failed to load wizard: ${response.statusText}`);
    return response.json();
  },

  // Load wizard (specific version)
  async loadWizardVersion(wizardKey: string, version: string): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/versions/${version}`);
    if (!response.ok) throw new Error(`Failed to load wizard version: ${response.statusText}`);
    return response.json();
  },

  // Load page definition (specific version - VERSION PINNING REQUIRED)
  async loadPageVersion(pageKey: string, version: string): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/versions/${version}`);
    if (!response.ok) throw new Error(`Failed to load page: ${response.statusText}`);
    return response.json();
  },

  // Create session
  async createSession(wizardKey: string, wizardVersion: string, prefillData?: Record<string, unknown>): Promise<SessionData> {
    const response = await fetch(`${API_BASE_URL}/api/embedded/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wizard_key: wizardKey,
        wizard_version: wizardVersion, // "v1", "v2", etc.
        state: {
          application: prefillData || {},
          context: {}
        }
      })
    });
    if (!response.ok) throw new Error(`Failed to create session: ${response.statusText}`);
    return response.json();
  },

  // Load session
  async loadSession(sessionId: string): Promise<SessionData> {
    const response = await fetch(`${API_BASE_URL}/api/embedded/sessions/${sessionId}`);
    if (!response.ok) throw new Error(`Failed to load session: ${response.statusText}`);
    return response.json();
  },

  // Update session state (PATCH not POST, no /prefill suffix)
  async updateSession(sessionId: string, state: SessionData['state'], currentStep?: string): Promise<SessionData> {
    const response = await fetch(`${API_BASE_URL}/api/embedded/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        current_step: currentStep
      })
    });
    if (!response.ok) throw new Error(`Failed to update session: ${response.statusText}`);
    return response.json();
  }
};
