import { useParams } from 'react-router-dom';

export function PageEditor() {
  const { wizardId, pageId } = useParams();

  return (
    <div className="page-editor">
      <header className="page-editor__header">
        <h1>Edit Page: {pageId}</h1>
        <span className="page-editor__wizard-id">Wizard: {wizardId}</span>
      </header>

      <main className="page-editor__content">
        <section className="page-editor__fields">
          <h2>Fields</h2>
          <p>Configure page fields here.</p>
        </section>

        <section className="page-editor__layout">
          <h2>Layout</h2>
          <p>Configure page layout here.</p>
        </section>

        <section className="page-editor__validation">
          <h2>Validation</h2>
          <p>Configure field validation rules here.</p>
        </section>
      </main>
    </div>
  );
}
