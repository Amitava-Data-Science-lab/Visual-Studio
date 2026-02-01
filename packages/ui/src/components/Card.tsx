import { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function Card({
  title,
  description,
  footer,
  children,
  className,
  ...props
}: CardProps) {
  const classes = ['vsb-card', className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {(title || description) && (
        <div className="vsb-card__header">
          {title && <h3 className="vsb-card__title">{title}</h3>}
          {description && <p className="vsb-card__description">{description}</p>}
        </div>
      )}

      <div className="vsb-card__content">{children}</div>

      {footer && <div className="vsb-card__footer">{footer}</div>}
    </div>
  );
}
