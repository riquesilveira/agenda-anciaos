"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { supabaseNavegador } from "@/lib/supabase/navegador";

/** Recorta no centro e reduz para um quadrado leve (JPEG), no próprio aparelho. */
async function reduzirFoto(arquivo: File, lado = 320): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const menor = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - menor) / 2, (bitmap.height - menor) / 2, menor, menor, 0, 0, lado, lado);
  bitmap.close?.();
  return new Promise((ok, erro) => canvas.toBlob((b) => (b ? ok(b) : erro(new Error("falha ao reduzir"))), "image/jpeg", 0.85));
}

/**
 * Enviar/trocar/remover foto. `caminho` é o arquivo no bucket "fotos"
 * (perfis/<id>.jpg ou membros/<id>.jpg); a permissão é do Storage (RLS).
 * `salvar` grava a URL (ou null) no banco.
 */
export function EnviarFoto({
  caminho,
  nome,
  fotoAtual,
  salvar,
  tamanho = 72,
  compacto = false,
}: {
  caminho: string;
  nome: string;
  fotoAtual: string | null;
  salvar: (url: string | null) => Promise<{ erro?: string }>;
  tamanho?: number;
  compacto?: boolean;
}) {
  const [foto, setFoto] = useState(fotoAtual);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(arquivo: File) {
    setOcupado(true);
    setErro("");
    try {
      const imagem = await reduzirFoto(arquivo);
      const fotos = supabaseNavegador().storage.from("fotos");
      const { error } = await fotos.upload(caminho, imagem, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      const url = `${fotos.getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`;
      const r = await salvar(url);
      if (r.erro) throw new Error(r.erro);
      setFoto(url);
    } catch (e) {
      console.error("Falha ao enviar foto", e);
      setErro("Não foi possível enviar a foto. Tente outra imagem.");
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover() {
    setOcupado(true);
    setErro("");
    await supabaseNavegador().storage.from("fotos").remove([caminho]);
    const r = await salvar(null);
    if (r.erro) setErro(r.erro);
    else setFoto(null);
    setOcupado(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={ocupado}
        className="group relative shrink-0 rounded-full"
        aria-label={foto ? "Trocar foto" : "Enviar foto"}
      >
        <Avatar nome={nome} foto={foto} tamanho={tamanho} className={ocupado ? "opacity-50" : ""} />
        <span className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow">
          <Camera size={12} />
        </span>
      </button>
      <div className={`min-w-0 ${compacto ? "text-xs" : "text-sm"}`}>
        <button type="button" onClick={() => entrada.current?.click()} disabled={ocupado} className="font-medium text-indigo-700 hover:underline">
          {ocupado ? "Enviando…" : foto ? "Trocar foto" : "Adicionar foto"}
        </button>
        {foto && !ocupado && (
          <button type="button" onClick={remover} className="ml-3 inline-flex items-center gap-1 text-slate-500 hover:text-red-600">
            <Trash2 size={13} /> Remover
          </button>
        )}
        {erro && <p className="mt-0.5 text-xs text-red-600">{erro}</p>}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) enviar(arquivo);
        }}
      />
    </div>
  );
}
