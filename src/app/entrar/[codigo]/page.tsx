import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { igrejaPorCodigo } from "./dados";
import { FormEntrada } from "./form-entrada";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar · IASD Agenda", robots: { index: false, follow: false } };

/** Link de entrada da igreja (público): o líder cria a própria conta. */
export default async function Entrar({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  // Quem já está logado vai direto para a agenda.
  const {
    data: { user },
  } = await (await supabaseServidor()).auth.getUser();
  if (user) redirect("/");

  const igreja = await igrejaPorCodigo(codigo);
  if (!igreja) notFound();

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 py-8">
      <header className="space-y-1 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icones/icone-192.png" alt="" width={48} height={48} className="mx-auto h-12 w-12 rounded-xl" />
        <h1 className="text-xl font-bold">Agenda da {/^igreja\b/i.test(igreja.nome) ? igreja.nome : `Igreja ${igreja.nome}`}</h1>
        <p className="text-sm text-slate-600">Crie seu acesso de líder para montar as escalas e cadastrar as programações do seu departamento.</p>
      </header>
      <FormEntrada codigo={codigo} departamentos={igreja.departamentos} />
      <p className="text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
