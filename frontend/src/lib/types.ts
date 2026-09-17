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
  status: string;
  subtotal: number | string;
  shipping: number | string;
  discount: number | string;
  total: number | string;
  createdAt: string;
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
