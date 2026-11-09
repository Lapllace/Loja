'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

/**
 * Busca da vitrine.
 * Mantém o contrato atual: envia o termo para /loja/produtos?search=...
 */
export function SearchBar({
  className = '',
  placeholder = 'O que você procura?',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const navigate = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/loja/produtos?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`group relative ${className}`}
    >
      <input
        type="search"
        name="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Buscar produtos"
        className="h-11 w-full rounded-full border border-border bg-muted/70 pl-11 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-accent/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/25"
      />

      <svg
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <svg
          className="size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </button>
    </form>
  );
}
