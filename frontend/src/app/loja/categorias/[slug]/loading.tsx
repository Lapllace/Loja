// Fallback de carregamento das páginas de categoria
export default function CategoryLoading() {
  return (
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom animate-pulse">
        <div className="mb-5 h-4 w-48 rounded bg-muted" />

        <div className="border-b border-border pb-8">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-3 h-10 w-64 max-w-full rounded bg-muted" />
          <div className="mt-3 h-4 w-full max-w-md rounded bg-muted" />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="aspect-[3/4] rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
