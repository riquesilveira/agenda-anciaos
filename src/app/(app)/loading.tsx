/** Aparece na hora em que se toca num link, enquanto a página vem do servidor. */
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-4" aria-busy aria-label="Carregando">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="h-10 w-full rounded-xl bg-slate-200/80" />
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="h-16 bg-white sm:h-28" />
        ))}
      </div>
    </div>
  );
}
