import { ReactNode } from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required,
  helpText,
  error,
  children,
  className,
}: FormFieldProps) {
  const baseClasses = 'vsb-form-field';
  const errorClasses = error ? 'vsb-form-field--error' : '';

  const classes = [baseClasses, errorClasses, className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <label htmlFor={id} className="vsb-form-field__label">
        {label}
        {required && <span className="vsb-form-field__required">*</span>}
      </label>

      <div className="vsb-form-field__control">{children}</div>

      {helpText && !error && (
        <span className="vsb-form-field__help">{helpText}</span>
      )}

      {error && <span className="vsb-form-field__error">{error}</span>}
    </div>
  );
}
