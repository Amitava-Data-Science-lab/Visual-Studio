import { SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  errorMessage?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, error, errorMessage, className, ...props }, ref) => {
    const baseClasses = 'vsb-select';
    const errorClasses = error ? 'vsb-select--error' : '';

    const classes = [baseClasses, errorClasses, className].filter(Boolean).join(' ');

    return (
      <div className="vsb-select-wrapper">
        <select ref={ref} className={classes} {...props}>
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && errorMessage && (
          <span className="vsb-select__error">{errorMessage}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
