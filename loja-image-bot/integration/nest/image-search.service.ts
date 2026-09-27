import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImageCollector } from '../../src/core/collector.js';
import { SerpApiGoogleImagesProvider } from '../../src/providers/serpapi-google-images.provider.js';
import type { ProductIdentity, SelectedImage } from '../../src/core/types.js';

@Injectable()
export class ImageSearchService {
  private readonly collector: ImageCollector;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('SERPAPI_KEY');
    if (!apiKey) throw new Error('SERPAPI_KEY não configurada.');

    this.collector = new ImageCollector(
      new SerpApiGoogleImagesProvider(apiKey),
      config.get<string>('IMAGE_BOT_STORAGE_DIR') ?? './storage/product-images',
    );
  }

  search(product: ProductIdentity) {
    return this.collector.search(product);
  }

  downloadSelected(product: ProductIdentity, images: SelectedImage[]) {
    return this.collector.downloadSelected(product, images);
  }
}
