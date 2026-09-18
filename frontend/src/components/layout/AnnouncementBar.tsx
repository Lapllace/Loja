export function AnnouncementBar() {
  return (
    <div className="h-8 bg-ink-dark text-accent">
      <div className="container-custom flex h-full items-center justify-center text-center text-[11px] font-semibold tracking-wide sm:text-xs">
        <span>Enviamos para todo o Brasil</span>
        <span className="mx-2 text-white/35" aria-hidden="true">|</span>
        <span>Desconto no PIX</span>
        <span className="mx-2 text-white/35" aria-hidden="true">|</span>
        <span className="hidden sm:inline">Atendimento humanizado</span>
      </div>
    </div>
  );
}
