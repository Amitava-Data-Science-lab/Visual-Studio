import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { api, WizardDefinition } from '@/api';
import { JsonEditor } from '@/components';

// Import the wizard schema
// @ts-ignore - schema will be loaded from the schemas package
import wizardSchema from '@vsb/schemas/wizard.v1.schema.json';

const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

const validateWizard = ajv.compile(wizardSchema);

export function WizardEditor() {
  const { wizardKey } = useParams<{ wizardKey: string }>();
  const navigate = useNavigate();

  const [wizard, setWizard] = useState<WizardDefinition | null>(null);
  const [jsonValue, setJsonValue] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (wizardKey) {
      loadWizard();
    } else {
      setLoading(false);
      navigate('/');
    }
  }, [wizardKey]);

  const loadWizard = async () => {
    if (!wizardKey) return;

    try {
      setLoading(true);
      const data = await api.getWizardDraft(wizardKey);
      setWizard(data);
      setJsonValue(JSON.stringify(data.definition, null, 2));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load wizard');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    try {
      const definition = JSON.parse(jsonValue);
      const valid = validateWizard(definition);

      if (valid) {
        setValidationErrors([]);
        setShowValidation(true);
        return true;
      } else {
        const errors = validateWizard.errors || [];
        const errorMessages = errors.map((err) => {
          const path = err.instancePath || 'root';
          return `${path}: ${err.message}`;
        });
        setValidationErrors(errorMessages);
        setShowValidation(true);
        return false;
      }
    } catch (err) {
      setValidationErrors([
        `Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
      ]);
      setShowValidation(true);
      return false;
    }
  };

  const handleSave = async () => {
    if (!wizardKey) return;

    // Validate before saving
    if (!handleValidate()) {
      alert('Please fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);
      const definition = JSON.parse(jsonValue);
      const updated = await api.updateWizardDraft(wizardKey, {
        definition,
        created_by: 'builder-ui',
      });
      setWizard(updated);
      setLastSaved(new Date());
      setShowValidation(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save wizard');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!wizardKey) return;

    // Validate before publishing
    if (!handleValidate()) {
      alert('Please fix validation errors before publishing');
      return;
    }

    // Save first
    try {
      setSaving(true);
      const definition = JSON.parse(jsonValue);
      await api.updateWizardDraft(wizardKey, {
        definition,
        created_by: 'builder-ui',
      });
      setSaving(false);
    } catch (err) {
      setSaving(false);
      alert(err instanceof Error ? err.message : 'Failed to save before publishing');
      return;
    }

    if (!confirm('Publish this wizard? This will create an immutable version.')) {
      return;
    }

    try {
      setPublishing(true);
      const result = await api.publishWizard(wizardKey);
      alert(
        `Successfully published ${result.wizard_key} as ${result.version}!\n\nChecksum: ${result.checksum}`
      );
      await loadWizard(); // Reload to show updated state
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish wizard');
    } finally {
      setPublishing(false);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonValue);
      setJsonValue(JSON.stringify(parsed, null, 2));
    } catch {
      alert('Invalid JSON - cannot format');
    }
  };

  if (loading) {
    return <div className="wizard-editor-loading">Loading wizard...</div>;
  }

  if (!wizard) {
    return <div className="wizard-editor-error">Wizard not found</div>;
  }

  return (
    <div className="wizard-editor">
      <header className="wizard-editor-header">
        <div className="wizard-editor-header-left">
          <button onClick={() => navigate('/')} className="btn-back">
            ← Back to List
          </button>
          <h1>{wizard.wizard_key}</h1>
          <span className="wizard-status-badge">{wizard.status}</span>
        </div>
        <div className="wizard-editor-header-right">
          {lastSaved && (
            <span className="last-saved">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <div className="wizard-editor-info">
        <div className="info-item">
          <strong>Version:</strong> {wizard.version}
        </div>
        <div className="info-item">
          <strong>Schema:</strong> {wizard.schema_version}
        </div>
        <div className="info-item">
          <strong>Checksum:</strong>{' '}
          <code title={wizard.checksum}>{wizard.checksum.substring(0, 16)}...</code>
        </div>
        <div className="info-item">
          <strong>Created:</strong> {new Date(wizard.created_at).toLocaleString()}
        </div>
      </div>

      <div className="wizard-editor-toolbar">
        <button onClick={handleValidate} className="btn-secondary">
          Validate
        </button>
        <button onClick={handleFormatJson} className="btn-secondary">
          Format JSON
        </button>
        <button
          onClick={handleSave}
          disabled={saving || publishing}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving || publishing}
          className="btn-success"
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>

      {showValidation && (
        <div
          className={`wizard-editor-validation ${
            validationErrors.length === 0 ? 'success' : 'error'
          }`}
        >
          <div className="validation-header">
            <h3>
              {validationErrors.length === 0
                ? '✓ Validation Passed'
                : '✗ Validation Failed'}
            </h3>
            <button onClick={() => setShowValidation(false)}>×</button>
          </div>
          {validationErrors.length > 0 && (
            <ul className="validation-errors">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="wizard-editor-content">
        <JsonEditor value={jsonValue} onChange={setJsonValue} height="600px" />
      </div>

      <div className="wizard-editor-help">
        <details>
          <summary>JSON Schema Help</summary>
          <div className="help-content">
            <h4>Wizard Definition Structure:</h4>
            <pre>
              {JSON.stringify(
                {
                  steps: [
                    {
                      id: 'step1',
                      title: 'Step Title',
                      fields: [
                        {
                          id: 'field1',
                          type: 'text',
                          label: 'Field Label',
                        },
                      ],
                    },
                  ],
                },
                null,
                2
              )}
            </pre>
            <p>
              <strong>Field Types:</strong> text, email, number, select,
              checkbox, textarea, date, radio, file, hidden
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
