interface Benefit {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const benefits: Benefit[] = [
  {
    title: 'Pagamento PIX',
    description: 'Aprovação instantânea para agilizar seu pedido.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h3.879a2.25 2.25 0 011.591.659l7.621 7.621a2.25 2.25 0 010 3.182l-4.379 4.379a2.25 2.25 0 01-3.182 0l-7.621-7.621A2.25 2.25 0 014.75 10.38V6A2.25 2.25 0 017.5 3.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h.008v.008H8.25V7.5z" />
      </svg>
    ),
  },
  {
    title: 'Envio Seguro',
    description: 'Produtos testados e embalados com cuidado.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75L12 3l8.25 3.75M3.75 6.75v10.5L12 21l8.25-3.75V6.75M3.75 6.75L12 10.5m8.25-3.75L12 10.5m0 0V21" />
      </svg>
    ),
  },
  {
    title: 'Qualidade Garantida',
    description: 'Acessórios e eletrônicos selecionados.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l2 2 4-4m5.25 1.25a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z" />
      </svg>
    ),
  },
  {
    title: 'Suporte Direto',
    description: 'Atendimento rápido e humanizado.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5h7.5m-7.5 3h4.5M6.75 19.5l-3 1.5.75-3.75A8.25 8.25 0 1112 20.25a8.2 8.2 0 01-5.25-.75z" />
      </svg>
    ),
  },
];

export function BenefitsSection() {
  return (
    <section className="border-y border-border bg-card py-12 md:py-16" aria-labelledby="benefits-title">
      <div className="container-custom">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Compra tranquila</p>
          <h2 id="benefits-title" className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            Confiança em cada pedido
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-xl border border-input bg-card p-5 transition-colors hover:border-accent/40"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <span className="size-5">{benefit.icon}</span>
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{benefit.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
