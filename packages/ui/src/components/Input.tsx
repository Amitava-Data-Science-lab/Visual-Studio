import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, errorMessage, className, ...props }, ref) => {
    const baseClasses = 'vsb-input';
    const errorClasses = error ? 'vsb-input--error' : '';

    const classes = [baseClasses, errorClasses, className].filter(Boolean).join(' ');

    return (
      <div className="vsb-input-wrapper">
        <input ref={ref} className={classes} {...props} />
        {error && errorMessage && (
          <span className="vsb-input__error">{errorMessage}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
