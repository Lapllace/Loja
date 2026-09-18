import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Botão base do Design System.
 *
 * Mantém a API anterior (primary/secondary/outline/ghost + sm/md/lg) para não
 * quebrar nenhuma chamada existente. O visual segue o template de referência:
 * transições suaves (`transition-all`), foco com halo suave no anel dourado e
 * bordas discretas nas variantes neutras.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap ' +
    'transition-all duration-200 outline-none select-none ' +
    'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ' +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5";

  const variantStyles = {
    // Ação principal: dourado da marca com leve escurecimento no hover.
    primary: 'bg-accent text-ink hover:bg-accent-dark shadow-sm shadow-accent/20',
    // Ação secundária: preto sólido.
    secondary: 'bg-ink text-white hover:bg-ink-dark shadow-sm',
    // Contorno: fundo claro, borda neutra e hover para superfície suave.
    outline: 'border border-input bg-background text-foreground hover:bg-muted hover:border-foreground/30',
    // Fantasma: sem fundo até o hover.
    ghost: 'text-foreground hover:bg-muted',
  };

  const sizeStyles = {
    sm: 'h-9 px-3.5 text-sm',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-7 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

