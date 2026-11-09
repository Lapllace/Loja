// Fallback de carregamento da página de produto
export default function ProductLoading() {
  return (
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom">
        <div className="animate-pulse">
          {/* Breadcrumb */}
          <div className="mb-6 h-4 w-64 max-w-full rounded bg-muted" />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            {/* Galeria */}
            <div>
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="mt-3 grid grid-cols-4 gap-2.5">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="aspect-square rounded-xl bg-muted" />
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <div className="h-6 w-28 rounded-full bg-muted" />
              <div className="h-10 w-4/5 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />

              <div className="rounded-2xl border border-border p-5">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="mt-3 h-9 w-40 rounded bg-muted" />
                <div className="mt-3 h-3 w-56 rounded bg-muted" />
              </div>

              <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                <div className="h-12 w-40 rounded-xl bg-muted" />
                <div className="h-12 rounded-xl bg-muted" />
              </div>

              <div className="h-11 rounded-xl bg-muted" />
              <div className="h-24 rounded-2xl bg-muted" />
              <div className="h-14 rounded-2xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
