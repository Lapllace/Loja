import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${siteUrl}/loja`, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/loja/produtos`, changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const [categories, products] = await Promise.all([
      api.getActiveCategories({ next: { revalidate: 3600, tags: ['categories'] } }),
      api.getProducts(
        { active: true },
        undefined,
        { next: { revalidate: 3600, tags: ['products'] } },
      ),
    ]);

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
      url: `${siteUrl}/loja/categorias/${category.slug}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${siteUrl}/loja/produtos/${product.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch {
    // API indisponível: sitemap com rotas estáticas
    return staticRoutes;
  }
}
