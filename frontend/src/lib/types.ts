// Types baseados na estrutura real do backend Prisma
// Adaptados para uso público (sem expor dados administrativos)

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

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  categoryId: string;
  brandId: string | null;
  category?: Category;
  brand?: Brand;
  images?: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

// Types para filtros e buscas
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

// Types para autenticação
export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  cpf?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Session {
  user: User;
  token: string;
}

export interface Address {
  id: string;
  nickname: string | null;
  recipient: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  reference: string | null;
  type: 'SHIPPING' | 'BILLING';
  isDefault: boolean;
}

export interface CreateAddressPayload {
  recipient: string;
  zipcode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  reference?: string;
  type?: 'SHIPPING' | 'BILLING';
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
}

export interface Order {
  id: string;
  number: string;
  userId?: string;
  status: string;
  subtotal: number | string;
  shipping: number | string;
  discount: number | string;
  total: number | string;
  notes?: string | null;
  /** Identificador estável da opção de frete escolhida. */
  shippingOptionId?: string | null;
  /** Nome da opção de frete escolhida no checkout (ex.: "Motoboy / Entrega Local"). */
  shippingOptionName?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  address?: {
    recipient: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

/** Uma opção de frete retornada por POST /shipping/calculate. */
export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  /** Prazo em dias úteis; `null` quando a transportadora não informa. */
  deliveryDays: number | null;
  isLocal?: boolean;
}

export interface ShippingQuote {
  options: ShippingOption[];
  /** 'superfrete' = API real; 'fallback' = frete fixo por região. */
  source: 'superfrete' | 'fallback';
}

export interface Payment {
  id: string;
  orderId: string;
  method: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  status: string;
  amount: number | string;
  checkoutUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  expiresAt?: string;
}

/** Formato persistido em localStorage na chave 'auth_session'. */
export interface StoredSession {
  token: string;
  user: User;
}

// ---- Carrinho (frontend) ----
// Modelo alinhado ao backend (CartsService.getCartByUser): items aninham `product`.
// `price`/`totalAmount` vêm do Prisma Decimal (serializado como string) — aceitamos number|string.

export interface CartItem {
  id?: string;
  productId: string;
  quantity: number;
  /** Preço unitário capturado no momento da adição (Decimal) */
  price?: number | string;
  name?: string;
  imageUrl?: string | null;
  /** Produto resolvido pelo backend (presente no GET /cart) */
  product?: Product;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  /** Total de unidades (soma das quantidades) — calculado no frontend */
  totalItems: number;
  /** Total monetário — calculado no frontend (Decimal-safe) */
  totalAmount: number | string;
}

/**
 * Payload aceito por POST /cart/items.
 * Contrato: SOMENTE productId e quantity — o backend rejeita userId, cartId,
 * price e product (o usuário vem do token e o preço é validado internamente).
 */
export interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

/** Payload aceito por PATCH /cart/items/:productId. */
export interface UpdateCartItemPayload {
  quantity: number;
}

/**
 * Resultado das operações de carrinho. Evita engolir erros: quando `ok` é
 * false, `status` permite distinguir 400 (estoque), 401 (sessão), 404 (item).
 */
export type CartMutationResult =
  | { ok: true; cart: Cart }
  | { ok: false; status: number; message?: string };

/** ---------------- Image Search (OWNER) ---------------- */

/** Entrada da busca: apenas o termo e obrigatorio. */
export interface ImageSearchQuery {
  query: string;
  brand?: string;
  model?: string;
  volume?: string;
  variant?: string;
  category?: string;
}

/** Candidata retornada pela busca (nao baixada ainda). */
export interface ImageCandidate {
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
}

/** Resposta da busca de imagens. */
export interface ImageSearchResult {
  query: string;
  queries: Array<{ text: string; reason: string }>;
  candidates: ImageCandidate[];
}

/** Resposta do autocomplete (Google Autocomplete via SerpApi). */
export interface ImageSuggestionsResult {
  suggestions: string[];
}

/** Imagem escolhida pelo usuario no dialogo de busca. */
export interface SelectedImageCandidate {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  query: string;
  /** Thumbnail para preview no formulario (nao vai ao backend). */
  thumbnailUrl?: string;
}

/** Payload de importacao das imagens selecionadas para um produto. */
export interface ImportSelectedImagesPayload {
  productId: string;
  name?: string;
  brand?: string;
  model?: string;
  volume?: string;
  variant?: string;
  category?: string;
  images: Array<{
    id: string;
    title: string;
    source: string;
    sourceUrl: string;
    imageUrl: string;
    thumbnailUrl?: string;
    query: string;
  }>;
}

/** Resultado da importacao (ProductImage criados). */
export interface ImportedImagesResult {
  product: { id: string; name: string; sku: string };
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
  }>;
  /** Contadores da importacao (uma imagem pode falhar sem abortar as outras). */
  imported?: number;
  failed?: number;
  /** Resultado por imagem selecionada, para informar o OWNER o que falhou. */
  results?: Array<
    | { success: true; id: string; url?: string }
    | { success: false; id: string; domain?: string; error?: string }
  >;
  manifestPath?: string;
}
/** Imagem salva pelo backend em /uploads. */
export interface UploadedImage {
  /** Rota estática pública, ex.: /uploads/1712345678-ab12cd34.jpg */
  url: string;
  fileName: string;
  size: number;
}

// ---- Registros administrativos (listagens do painel) ----

export interface AdminPayment {
  id: string;
  orderId: string;
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BOLETO' | 'CASH';
  source?: 'ONLINE' | 'PHYSICAL';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number | string;
  transactionId?: string | null;
  provider?: string | null;
  paidAt?: string | null;
  createdAt: string;
  order?: { id: string; number: number; userId: string } | null;
}

export interface AdminDelivery {
  id: string;
  orderId: string;
  method: 'PICKUP' | 'UBER' | 'NINENINE' | 'MANUAL';
  provider: string;
  status: string;
  shippingCost: number | string;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  courierName?: string | null;
  estimatedDelivery?: string | null;
  createdAt: string;
  order?: { id: string; number: number; userId: string } | null;
}

export interface PendingDeliveryAuthorization {
  deliveryId: string;
  orderId?: string;
  orderNumber?: number;
  destination?: { recipient?: string | null; city?: string | null; state?: string | null } | null;
  [key: string]: unknown;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED';
  createdAt: string;
}

/** Campos do formulário de produto no painel administrativo. */
export interface ProductFormPayload {
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  stock: number;
  categoryId: string;
  brandId?: string;
  active?: boolean;
  featured?: boolean;
  /** Arquivo da imagem principal (opcional quando já há uma URL). */
  image?: File | null;
  /** Imagens adicionais do mesmo upload, limitadas pelo formulário a quatro. */
  images?: File[];
}
