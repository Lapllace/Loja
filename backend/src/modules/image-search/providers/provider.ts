import type { ImageCandidate, ProductIdentity, SearchQuery } from '../core/types';

export interface ImageSearchProvider {
  search(product: ProductIdentity, query: SearchQuery): Promise<ImageCandidate[]>;
}
