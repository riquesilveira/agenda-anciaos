"use client";

import { useRouter } from "next/navigation";
import { EnviarFoto } from "@/components/enviar-foto";
import { salvarFotoPerfil } from "../acoes";

export function FotoPerfil({ id, nome, foto }: { id: string; nome: string; foto: string | null }) {
  const router = useRouter();
  return (
    <EnviarFoto
      caminho={`perfis/${id}.jpg`}
      nome={nome}
      fotoAtual={foto}
      salvar={async (url) => {
        const r = await salvarFotoPerfil(url);
        if (!r.erro) router.refresh();
        return r;
      }}
    />
  );
}
