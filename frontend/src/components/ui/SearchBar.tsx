'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar({ className = '' }: { className?: string }) {
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
    <form onSubmit={handleSubmit} role="search" className={`relative ${className}`}>
      <input
        type="search"
        name="search"
        value={query}
        onChange={handleChange}
        placeholder="Buscar produtos..."
        aria-label="Buscar produtos"
        className="w-full px-4 py-2.5 pl-11 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
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
    </form>
  );
}
