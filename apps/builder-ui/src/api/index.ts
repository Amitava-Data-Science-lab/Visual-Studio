// API client for builder UI

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ApiError {
  message: string;
  detail?: unknown;
}

export interface WizardDefinition {
  id: string;
  wizard_key: string;
  version: string;
  status: string;
  schema_version: string;
  definition: Record<string, unknown>;
  checksum: string;
  created_by: string;
  created_at: string;
  published_at: string | null;
}

export interface PageDefinition {
  id: string;
  page_key: string;
  version: string;
  status: string;
  schema_version: string;
  definition: Record<string, unknown>;
  checksum: string;
  created_by: string;
  created_at: string;
  published_at: string | null;
}

export interface PublishResponse {
  wizard_key?: string;
  page_key?: string;
  version: string;
  status: string;
  published_at: string;
  checksum: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: `HTTP ${response.status}: ${response.statusText}`
    }));
    const errorMessage = error.detail
      ? (typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail))
      : `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Wizards
  async listWizards(includePublished = false): Promise<WizardDefinition[]> {
    const url = `${API_BASE_URL}/api/wizards${includePublished ? '?include_published=true' : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getWizardDraft(wizardKey: string): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/draft`);
    return handleResponse(response);
  },

  async createWizardDraft(data: {
    wizard_key: string;
    definition: Record<string, unknown>;
    schema_version?: string;
    created_by?: string;
  }): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateWizardDraft(wizardKey: string, data: {
    definition: Record<string, unknown>;
    created_by?: string;
  }): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteWizardDraft(wizardKey: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/draft`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async publishWizard(wizardKey: string): Promise<PublishResponse> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/publish`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async getWizardVersion(wizardKey: string, version: string): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/versions/${version}`);
    return handleResponse(response);
  },

  async getLatestWizard(wizardKey: string): Promise<WizardDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/latest`);
    return handleResponse(response);
  },

  async listWizardVersions(wizardKey: string): Promise<WizardDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/api/wizards/${wizardKey}/versions`);
    return handleResponse(response);
  },

  // Pages
  async listPages(includePublished = false): Promise<PageDefinition[]> {
    const url = `${API_BASE_URL}/api/pages${includePublished ? '?include_published=true' : ''}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getPageDraft(pageKey: string): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/draft`);
    return handleResponse(response);
  },

  async createPageDraft(data: {
    page_key: string;
    definition: Record<string, unknown>;
    schema_version?: string;
    created_by?: string;
  }): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePageDraft(pageKey: string, data: {
    definition: Record<string, unknown>;
    created_by?: string;
  }): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deletePageDraft(pageKey: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/draft`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  async publishPage(pageKey: string): Promise<PublishResponse> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/publish`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async getPageVersion(pageKey: string, version: string): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/versions/${version}`);
    return handleResponse(response);
  },

  async getLatestPage(pageKey: string): Promise<PageDefinition> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/latest`);
    return handleResponse(response);
  },

  async listPageVersions(pageKey: string): Promise<PageDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/api/pages/${pageKey}/versions`);
    return handleResponse(response);
  },
};
