'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { resolveImageUrl } from '@/lib/api';

const FALLBACK_IMAGE = '/images/placeholder.svg';

interface SafeImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string | null | undefined;
  alt: string;
  /** Fallback usado quando a URL é inválida ou falha ao carregar */
  fallbackSrc?: string;
}

/**
 * Wrapper de next/image com fallback em caso de URL inválida,
 * imagem inexistente ou erro de carregamento.
 * Nunca quebra o layout: sempre exibe uma imagem.
 */
export function SafeImage({ src, alt, fallbackSrc = FALLBACK_IMAGE, ...props }: SafeImageProps) {
  const resolved = resolveImageUrl(src) ?? fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(resolved);

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
  };

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={handleError}
    />
  );
}
