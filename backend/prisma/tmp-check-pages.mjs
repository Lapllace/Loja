// Verifica o conteudo renderizado das paginas da vitrine.
const SITE = 'http://localhost:3001';

async function get(path) {
  const res = await fetch(SITE + path);
  return { status: res.status, body: await res.text() };
}

const checks = [
  ['/loja/categorias/carregadores', ['Carregador Turbo 18W para iPhone', 'Kit Carregador Turbo 40W', 'Carregador Turbo 40W 9.1A', 'Carregador GaN 25W', 'Carregadores']],
  ['/loja/categorias/acessorios', ['Power Bank 10.000mAh', 'Power Bank Magnetico 5.000mAh', 'Acessorios']],
  ['/loja/categorias/cabos', ['Cabo USB-C 60W', 'Cabos']],
  ['/loja/categorias/audio', ['Caixa de Som Bluetooth RGB', 'Microfone de Lapela Sem Fio']],
  ['/loja/categorias/armazenamento', ['Cartao MicroSD 32GB', 'Cartao MicroSD 16GB']],
  ['/loja/categorias/rastreamento', ['Smart Tag Rastreador para Apple Find My', 'Smart Tag Rastreador para Android']],
  ['/loja/categorias/suportes', ['Suporte Veicular Magnetico para Celular']],
  ['/loja/categorias/smartwatches', ['Smartwatch S11 Mini', 'Smartwatch Ultra 9', 'Smartwatch XBO 9 Ultra', 'Pulseira para Smartwatch']],
  ['/loja/produtos', ['Carregador Turbo 18W para iPhone', 'Smartwatch S11 Mini', 'Power Bank Magnetico 10.000mAh', 'Pulseira para Smartwatch']],
];

const productPages = [
  ['/loja/produtos/carregador-turbo-18w-para-iphone-kd-550a', ['Carregador Turbo 18W para iPhone', 'KD-550A', 'Kaidi', '34,90']],
  ['/loja/produtos/smartwatch-xbo-9-ultra', ['Smartwatch XBO 9 Ultra', 'XBO', '149,90']],
  ['/loja/produtos/pulseira-para-smartwatch', ['Pulseira para Smartwatch', '29,90']],
  ['/loja/produtos/power-bank-10-000mah-bte-20', ["α'GOLD", '99,90']],
];

let fail = 0;

for (const [path, needles] of checks) {
  const r = await get(path);
  const missing = needles.filter((n) => !r.body.includes(n));
  const ok = r.status === 200 && missing.length === 0;
  if (!ok) fail++;
  console.log((ok ? 'OK   ' : 'FALHA') + ' + path + '[' + r.status + ']' + (missing.length ? ' faltando: ' + missing.join(' / ') : ''));
}

for (const [path, needles] of productPages) {
  const r = await get(path);
  const missing = needles.filter((n) => !r.body.includes(n));
  const ok = r.status === 200 && missing.length === 0;
  if (!ok) fail++;
  console.log((ok ? 'OK   ' : 'FALHA') + ' + path + '[' + r.status + ']' + (missing.length ? ' faltando: ' + missing.join(' / ') : ''));
}

// /loja (destaques) exige inStock -> produtos sem estoque nao aparecem la.
const home = await get('/loja');
console.log('INFO /loja [' + home.status + '] destaque com estoque? ' + home.body.includes('Fone Bluetooth In-Ear Premium'));

console.log(fail === 0 ? 'TODAS AS VERIFICACOES PASSARAM' : 'FALHAS: ' + fail);
process.exit(0);
