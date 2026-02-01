import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, disabled, className, ...props }, ref) => {
    const baseClasses = 'vsb-btn';
    const variantClasses = `vsb-btn--${variant}`;
    const sizeClasses = `vsb-btn--${size}`;
    const loadingClasses = loading ? 'vsb-btn--loading' : '';

    const classes = [baseClasses, variantClasses, sizeClasses, loadingClasses, className]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="vsb-btn__spinner" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
