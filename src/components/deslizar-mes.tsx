"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Arrastar para o lado troca o mês (celular) e o mês novo entra deslizando.
 * As setas do cabeçalho já deixam os meses vizinhos pré-carregados, então a
 * troca é praticamente instantânea.
 */
export function DeslizarMes({
  mes,
  anterior,
  proximo,
  children,
}: {
  mes: string;
  anterior: string; // URL do mês anterior
  proximo: string; // URL do próximo mês
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toque = useRef<{ x: number; y: number } | null>(null);
  // Direção da animação: compara com o mês mostrado antes.
  const [visto, setVisto] = useState({ mes, direcao: null as "esq" | "dir" | null });
  if (visto.mes !== mes) setVisto({ mes, direcao: mes > visto.mes ? "esq" : "dir" });

  return (
    <div
      key={mes}
      onTouchStart={(e) => (toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const inicio = toque.current;
        toque.current = null;
        if (!inicio) return;
        const dx = e.changedTouches[0].clientX - inicio.x;
        const dy = e.changedTouches[0].clientY - inicio.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) router.push(dx < 0 ? proximo : anterior, { scroll: false });
      }}
      className={`touch-pan-y ${visto.direcao === "esq" ? "animate-entrar-direita" : visto.direcao === "dir" ? "animate-entrar-esquerda" : ""}`}
    >
      {children}
    </div>
  );
}
