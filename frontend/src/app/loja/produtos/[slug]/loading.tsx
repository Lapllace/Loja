// Fallback de carregamento da página de produto
export default function ProductLoading() {
  return (
    <div className="py-8 md:py-10">
      <div className="container-custom">
        <div className="animate-pulse">
          {/* Breadcrumb */}
          <div className="h-4 w-64 bg-muted rounded mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
            {/* Galeria */}
            <div className="aspect-square bg-muted rounded-lg" />
            {/* Info */}
            <div className="space-y-4">
              <div className="h-3 w-24 bg-muted rounded" />
              <div className="h-9 w-3/4 bg-muted rounded" />
              <div className="h-7 w-36 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-20 w-full bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
