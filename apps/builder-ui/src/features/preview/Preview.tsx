import { useParams } from 'react-router-dom';

export function Preview() {
  const { wizardId } = useParams();

  return (
    <div className="preview">
      <header className="preview__header">
        <h1>Preview Wizard</h1>
        <span className="preview__wizard-id">ID: {wizardId}</span>
      </header>

      <main className="preview__content">
        <div className="preview__frame">
          {/* Runtime UI will be rendered here via iframe or shared component */}
          <p>Wizard preview will render here...</p>
        </div>
      </main>

      <footer className="preview__actions">
        <button type="button">Reset Preview</button>
        <button type="button">Open in New Tab</button>
      </footer>
    </div>
  );
}
