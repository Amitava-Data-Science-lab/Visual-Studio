import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, WizardDefinition } from '@/api';

export function WizardList() {
  const navigate = useNavigate();
  const [wizards, setWizards] = useState<WizardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWizardKey, setNewWizardKey] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWizards();
  }, []);

  const loadWizards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listWizards(false); // Only drafts
      setWizards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wizards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newWizardKey.trim()) {
      alert('Please enter a wizard key');
      return;
    }

    try {
      setCreating(true);
      const wizard = await api.createWizardDraft({
        wizard_key: newWizardKey,
        definition: {
          steps: [
            {
              id: 'step1',
              title: 'First Step',
              fields: [
                {
                  id: 'field1',
                  type: 'text',
                  label: 'Example Field',
                },
              ],
            },
          ],
        },
        created_by: 'builder-ui',
      });
      setShowCreateModal(false);
      setNewWizardKey('');
      navigate(`/wizards/${wizard.wizard_key}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create wizard');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (wizardKey: string) => {
    if (!confirm(`Delete draft for "${wizardKey}"?`)) {
      return;
    }

    try {
      await api.deleteWizardDraft(wizardKey);
      await loadWizards();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete wizard');
    }
  };

  if (loading) {
    return <div className="wizard-list-loading">Loading wizards...</div>;
  }

  if (error) {
    return (
      <div className="wizard-list-error">
        <p>Error: {error}</p>
        <button onClick={loadWizards}>Retry</button>
      </div>
    );
  }

  return (
    <div className="wizard-list">
      <header className="wizard-list-header">
        <h1>Wizard Drafts</h1>
        <button
          className="wizard-list-create-btn"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Wizard
        </button>
      </header>

      {wizards.length === 0 ? (
        <div className="wizard-list-empty">
          <p>No wizard drafts yet.</p>
          <button onClick={() => setShowCreateModal(true)}>
            Create your first wizard
          </button>
        </div>
      ) : (
        <div className="wizard-list-grid">
          {wizards.map((wizard) => (
            <div key={wizard.id} className="wizard-card">
              <div className="wizard-card-header">
                <h3>{wizard.wizard_key}</h3>
                <span className="wizard-card-status">{wizard.status}</span>
              </div>
              <div className="wizard-card-meta">
                <p>Version: {wizard.version}</p>
                <p>Created: {new Date(wizard.created_at).toLocaleString()}</p>
                <p>By: {wizard.created_by}</p>
              </div>
              <div className="wizard-card-actions">
                <button
                  onClick={() => navigate(`/wizards/${wizard.wizard_key}`)}
                  className="btn-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(wizard.wizard_key)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Wizard</h2>
            <div className="modal-content">
              <label htmlFor="wizard-key">
                Wizard Key
                <small>e.g., "travel-insurance-uk"</small>
              </label>
              <input
                id="wizard-key"
                type="text"
                value={newWizardKey}
                onChange={(e) => setNewWizardKey(e.target.value)}
                placeholder="wizard-key-here"
                disabled={creating}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setShowCreateModal(false);
                }}
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newWizardKey.trim()}
                className="btn-primary"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
