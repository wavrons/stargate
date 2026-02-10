import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, style, ...props }, ref) => {
    const buttonStyle =
      variant === 'primary'
        ? {
            backgroundColor: 'var(--primary-cta)',
            color: 'var(--on-primary)',
            borderRadius: 'var(--radius)',
            ...style,
          }
        : variant === 'secondary'
          ? {
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border-color)',
              ...style,
            }
          : {
              borderRadius: 'var(--radius)',
              ...style,
            };

    return (
      <button
        ref={ref}
        style={buttonStyle}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'hover:opacity-90 active:opacity-80': variant === 'primary',
            'btn-secondary-theme focus-visible:ring-[var(--accent)]': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-600':
              variant === 'danger',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
