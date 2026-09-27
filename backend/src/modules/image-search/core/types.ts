export type ProductIdentity = {
  productId?: string;
  name: string;
  brand?: string;
  model?: string;
  volume?: string;
  variant?: string;
  category?: string;
};

export type SearchQuery = {
  text: string;
  reason: string;
};

export type ImageCandidate = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  imageUrl: string;
  width?: number;
  height?: number;
  position?: number;
  query: string;
  score: number;
};

export type SearchResult = {
  product: ProductIdentity;
  queries: SearchQuery[];
  candidates: ImageCandidate[];
};

export type SelectedImage = Pick<
  ImageCandidate,
  'id' | 'title' | 'source' | 'sourceUrl' | 'imageUrl' | 'query' | 'thumbnailUrl'
>;

export type ManifestImage = SelectedImage & {
  file: string;
  sha256: string;
  collectedAt: string;
  bytes: number;
  contentType: string;
};

export type ImageDownloadAttempt =
  | {
      success: true;
      id: string;
      imageUrl: string;
      sourceUrl: string;
      query: string;
      buffer: Buffer;
      contentType: string;
      extension: string;
      sha256: string;
    }
  | {
      success: false;
      id: string;
      error: string;
      domain?: string;
    };

export type ProductImageManifest = {
  product: ProductIdentity;
  generatedAt: string;
  images: ManifestImage[];
};
