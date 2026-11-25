/** Foto redonda da pessoa; sem foto, as iniciais numa cor fixa pelo nome. */
const CORES = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500", "bg-teal-500", "bg-orange-500"];

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function corDoNome(nome: string): string {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

export function Avatar({
  nome,
  foto,
  tamanho = 32,
  cor,
  className = "",
}: {
  nome: string;
  foto?: string | null;
  tamanho?: number;
  /** Classe de fundo fixa (ex: a cor escolhida pelo ancião). */
  cor?: string | null;
  className?: string;
}) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(9, Math.round(tamanho * 0.4)) };
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nome} width={tamanho} height={tamanho} style={estilo} className={`shrink-0 rounded-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <span
      aria-hidden
      style={estilo}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${cor ?? corDoNome(nome)} ${className}`}
    >
      {iniciais(nome)}
    </span>
  );
}
