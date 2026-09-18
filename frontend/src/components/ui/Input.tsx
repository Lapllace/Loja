import React from 'react';

/**
 * Classes compartilhadas para inputs de formulário.
 *
 * Exportado separadamente para que páginas que já renderizam `<input>` /
 * `<select>` / `<textarea>` diretamente (ex.: checkout, conta, admin) possam
 * reutilizar o mesmo visual sem precisar trocar o elemento.
 */
export const inputClassName =
  'w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground transition-colors duration-200 outline-none ' +
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 ' +
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 ' +
  'aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rótulo opcional; quando informado, envolve o input e liga via htmlFor/id. */
  label?: string;
}

/**
 * Input base do Design System.
 *
 * Borda refinada com foco limpo (borda dourada + halo suave) usando apenas
 * Tailwind nativo. Repassa todas as props nativas de `<input>`.
 */
export function Input({ label, className = '', id, ...props }: InputProps) {
  const input = <input id={id} className={`${inputClassName} ${className}`} {...props} />;

  if (!label) return input;

  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {input}
    </label>
  );
}
