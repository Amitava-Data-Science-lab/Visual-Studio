import { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorMessage?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, errorMessage, className, ...props }, ref) => {
    const baseClasses = 'vsb-textarea';
    const errorClasses = error ? 'vsb-textarea--error' : '';

    const classes = [baseClasses, errorClasses, className].filter(Boolean).join(' ');

    return (
      <div className="vsb-textarea-wrapper">
        <textarea ref={ref} className={classes} {...props} />
        {error && errorMessage && (
          <span className="vsb-textarea__error">{errorMessage}</span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
