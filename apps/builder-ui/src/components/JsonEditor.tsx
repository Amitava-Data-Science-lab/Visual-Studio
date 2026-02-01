import { Editor } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  height = '500px',
  readOnly = false,
}: JsonEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Format the JSON when component mounts if valid
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      if (formatted !== value) {
        onChange(formatted);
      }
    } catch {
      // Invalid JSON, don't format
    }
  }, []);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;

    // Set up format on paste
    editor.onDidPaste(() => {
      try {
        const value = editor.getValue();
        const parsed = JSON.parse(value);
        const formatted = JSON.stringify(parsed, null, 2);
        editor.setValue(formatted);
      } catch {
        // Invalid JSON, don't format
      }
    });
  };

  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <Editor
      height={height}
      defaultLanguage="json"
      value={value}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
      }}
      theme="vs-dark"
    />
  );
}
