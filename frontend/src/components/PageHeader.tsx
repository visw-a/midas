export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-500">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-bold text-navy-900">{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-sm text-navy-600">{description}</p>}
    </header>
  );
}
