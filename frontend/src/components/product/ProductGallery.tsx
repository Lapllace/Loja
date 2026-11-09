'use client';

import React, { useState } from 'react';
import { ProductImage } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const selected = images.find((img) => img.id === selectedId) ?? images[0] ?? null;

  if (images.length === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-border/80 bg-muted">
        <svg className="w-16 h-16 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-muted-foreground text-sm">Sem imagens disponíveis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Imagem principal */}
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-sm">
        <SafeImage
          src={selected?.url ?? null}
          alt={selected?.alt || productName}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2.5">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedId(image.id)}
              aria-label={`Ver imagem: ${image.alt || productName}`}
              className={`relative aspect-square overflow-hidden rounded-xl border border-input bg-muted transition-all ${
                selected?.id === image.id
                  ? 'ring-2 ring-accent'
                  : 'hover:border-accent/50'
              }`}
            >
              <SafeImage
                src={image.url}
                alt={image.alt || productName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 120px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
