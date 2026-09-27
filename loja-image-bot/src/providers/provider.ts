import type { ImageCandidate, ProductIdentity, SearchQuery } from '../core/types.js';

export interface ImageSearchProvider {
  search(product: ProductIdentity, query: SearchQuery): Promise<ImageCandidate[]>;
}
