export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const classes = ['vsb-spinner', `vsb-spinner--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} aria-label="Loading" />;
}
