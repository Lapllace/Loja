/**
 * Utilitario para adicionar imagens aos produtos da vitrine.
 *
 * COMO O PROJETO SERVE IMAGENS (importante):
 *  - O backend NestJS NAO serve arquivos estaticos.
 *  - Quem serve os arquivos e o Next.js do frontend, a partir de
 *    frontend/public/  ->  http://localhost:3001/images/...
 *  - Por isso as imagens sao gravadas em frontend/public/images/products/
 *    e o banco guarda a URL ABSOLUTA apontando para o frontend, exatamente
 *    como ja faz o seed existente (prisma/seed-vitrine.mjs).
 *  - O registro usa o endpoint existente POST /api/products/:productId/images
 *    (modelo ProductImage: url, alt, position).
 *
 * MODOS
 *
 *  1) ARQUIVO LOCAL — copia o arquivo para dentro do projeto:
 *
 *       node prisma/imagens-produtos.mjs local ^
 *         --slug carregador-turbo-18w-para-iphone-kd-550a ^
 *         --file "C:\fotos\kd550a.jpg" ^
 *         --alt "Carregador Kaidi KD-550A"
 *
 *  2) URL DA INTERNET — baixa a imagem para dentro do projeto (recomendado:
 *     nao deixa URL externa no banco):
 *
 *       node prisma/imagens-produtos.mjs url ^
 *         --slug carregador-turbo-18w-para-iphone-kd-550a ^
 *         --src "https://exemplo.com/foto.jpg" ^
 *         --alt "Carregador Kaidi KD-550A"
 *
 *     Se preferir guardar a URL externa direto no banco (sem baixar), use
 *     --link-only. Nesse caso confira se o host esta permitido nos
 *     remotePatterns de frontend/next.config.ts.
 *
 * OBSERVACOES
 *  - Exige backend rodando e token ADMIN/OWNER em backend/.tmp-token.txt
 *    (ou na env ADMIN_TOKEN).
 *  - Nao valida licenca/direito de uso da imagem: confira a origem antes.
 *  - --position define a ordem na galeria (0 = imagem principal).
 *  - Arquivos duplicados de outro produto: use sempre um slug por arquivo.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');
const projectRoot = resolve(__dirname, '..', '..');
const frontendPublic = join(projectRoot, 'frontend', 'public');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/+$/, '');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else {
        out[key] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

function getToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN.trim();
  const p = join(backendRoot, '.tmp-token.txt');
  if (existsSync(p)) return readFileSync(p, 'utf8').trim();
  throw new Error('Token nao encontrado. Defina ADMIN_TOKEN ou crie backend/.tmp-token.txt');
}

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

const MIN_BYTES = 2048;

async function downloadTo(src, destDir, slug) {
  const res = await fetch(src, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LojaImageFetch/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('download falhou: HTTP ' + res.status);

  const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new Error('URL nao retornou imagem (content-type: ' + (contentType || 'desconhecido') + ')');
  }

  let ext = MIME_EXT[contentType];
  if (!ext) {
    const fromUrl = extname(new URL(src).pathname).toLowerCase();
    ext = fromUrl && fromUrl.length <= 6 ? fromUrl : '.jpg';
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) {
    throw new Error('imagem suspeita: apenas ' + buf.length + ' bytes (provavel placeholder/erro)');
  }

  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, slug + ext);
  writeFileSync(dest, buf);
  return { dest, bytes: buf.length, contentType };
}

/** Converte caminho absoluto em <frontend/public> para URL publica do site. */
function toPublicUrl(absPath) {
  const rel = absPath.slice(frontendPublic.length).split('\\').join('/');
  return SITE_BASE + (rel.startsWith('/') ? rel : '/' + rel);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args._[0];

  if (!['local', 'url'].includes(mode) || !args.slug) {
    console.log('Uso:');
    console.log('  node prisma/imagens-produtos.mjs local --slug <slug> --file <caminho> [--alt "..."] [--position 0]');
    console.log('  node prisma/imagens-produtos.mjs url   --slug <slug> --src <https://...> [--alt "..."] [--position 0] [--link-only]');
    process.exit(1);
  }

  const product = await prisma.product.findUnique({
    where: { slug: args.slug },
    select: {
      id: true,
      slug: true,
      name: true,
      images: { select: { id: true, url: true, position: true } },
    },
  });
  if (!product) throw new Error('Produto nao encontrado: ' + args.slug);

  const alt = typeof args.alt === 'string' ? args.alt : product.name;
  const position = args.position !== undefined ? Number(args.position) : product.images.length;
  const destDir = join(frontendPublic, 'images', 'products');

  let url;

  if (mode === 'url') {
    if (!args.src || typeof args.src !== 'string') throw new Error('--src e obrigatorio no modo url');
    if (args['link-only']) {
      url = args.src;
      console.log('[link-only] URL externa usada direto: ' + url);
      console.log('Confirme que o host esta nos remotePatterns de frontend/next.config.ts.');
    } else {
      const r = await downloadTo(args.src, destDir, product.slug);
      url = toPublicUrl(r.dest);
      console.log('baixado ' + r.bytes + ' bytes (' + r.contentType + ') -> ' + r.dest);
    }
  } else {
    if (!args.file || typeof args.file !== 'string') throw new Error('--file e obrigatorio no modo local');
    const srcPath = resolve(args.file);
    if (!existsSync(srcPath)) throw new Error('arquivo nao encontrado: ' + srcPath);
    mkdirSync(destDir, { recursive: true });
    const ext = extname(srcPath).toLowerCase() || '.jpg';
    const dest = join(destDir, product.slug + ext);
    copyFileSync(srcPath, dest);
    url = toPublicUrl(dest);
    console.log('copiado -> ' + dest);
  }

  console.log('url registrada: ' + url);

  const token = getToken();
  const res = await fetch(API_BASE + '/products/' + product.id + '/images', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ url, alt, position }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error('POST imagens falhou: HTTP ' + res.status + ': ' + text);
  }

  const created = await res.json();
  console.log('OK produto=' + product.slug + ' imageId=' + created.id + ' position=' + created.position);
  console.log('Abra ' + SITE_BASE + '/loja/produtos/' + product.slug + ' para conferir.');
}

main()
  .catch((e) => {
    console.error('ERRO: ' + e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
