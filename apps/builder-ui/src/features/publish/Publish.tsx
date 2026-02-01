import { useState } from 'react';
import { useParams } from 'react-router-dom';

export function Publish() {
  const { wizardId } = useParams();
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handlePublish = async () => {
    setIsPublishing(true);
    setValidationErrors([]);

    try {
      // TODO: Call backend validation + publish endpoint
      console.log('Publishing wizard:', wizardId);
    } catch (error) {
      setValidationErrors(['Publication failed. Please try again.']);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="publish">
      <header className="publish__header">
        <h1>Publish Wizard</h1>
        <span className="publish__wizard-id">ID: {wizardId}</span>
      </header>

      <main className="publish__content">
        <section className="publish__validation">
          <h2>Validation Status</h2>
          {validationErrors.length > 0 ? (
            <ul className="publish__errors">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          ) : (
            <p>No validation errors found.</p>
          )}
        </section>

        <section className="publish__versions">
          <h2>Version History</h2>
          <p>Previous versions will be listed here.</p>
        </section>
      </main>

      <footer className="publish__actions">
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? 'Publishing...' : 'Publish New Version'}
        </button>
      </footer>
    </div>
  );
}
