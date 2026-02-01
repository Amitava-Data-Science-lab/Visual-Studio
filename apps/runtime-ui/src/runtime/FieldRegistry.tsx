import type { Field } from '@/api/runtimeApi';

// Extended field type with additional props for rendering
interface FieldForRendering extends Field {
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  rows?: number;
  options?: Array<{ value: string; label: string }>;
}

interface FieldRegistryProps {
  field: FieldForRendering;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FieldRegistry({ field, value, onChange }: FieldRegistryProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            value={(value as number) ?? ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            min={field.min}
            max={field.max}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={field.id}
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={field.rows ?? 4}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        );

      default:
        return <p>Unknown field type: {field.type}</p>;
    }
  };

  return (
    <div className={`vsb-field vsb-field--${field.type}`}>
      <label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="vsb-field__required">*</span>}
      </label>
      {renderField()}
      {field.helpText && <small className="vsb-field__help">{field.helpText}</small>}
    </div>
  );
}
