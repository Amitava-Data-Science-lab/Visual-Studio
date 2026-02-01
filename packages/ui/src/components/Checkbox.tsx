import { InputHTMLAttributes, forwardRef } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: boolean;
  errorMessage?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, errorMessage, className, id, ...props }, ref) => {
    const baseClasses = 'vsb-checkbox';
    const errorClasses = error ? 'vsb-checkbox--error' : '';

    const classes = [baseClasses, errorClasses, className].filter(Boolean).join(' ');

    return (
      <div className={classes}>
        <input ref={ref} type="checkbox" id={id} {...props} />
        {label && (
          <label htmlFor={id} className="vsb-checkbox__label">
            {label}
          </label>
        )}
        {error && errorMessage && (
          <span className="vsb-checkbox__error">{errorMessage}</span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
