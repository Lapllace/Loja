// Tipos baseados nas respostas REAIS da API do backend (NestJS + Prisma).
// Somente campos públicos são declarados aqui (o backend não expõe costPrice).
// Importante: Decimal do Prisma é serializado como STRING no JSON
// (ex.: price: "199.9"), por isso o tipo é number | string.

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  position: number;
  productId: string;
  createdAt: string;
}

/** Relações incluídas nas respostas de produto (versão pública resumida) */
export interface ProductCategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number | string;
  comparePrice: number | string | null;
  stock: number;
  active: boolean;
  featured: boolean;
  categoryId: string;
  brandId: string | null;
  category?: ProductCategorySummary | null;
  brand?: Pick<Brand, 'id' | 'name' | 'slug'> | null;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

// Types para filtros e buscas (query params suportados pela API)
export interface ProductFilters {
  categoryId?: string;
  brandId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  active?: boolean;
  inStock?: boolean;
}

export interface ProductSort {
  field: 'name' | 'price' | 'createdAt' | 'stock';
  order: 'asc' | 'desc';
}

// Types para componentes UI
export interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export interface CategoryCardProps {
  category: Category;
}

// Types para navegação
export interface RouteParams {
  slug: string;
}
