import { redirect } from "next/navigation";
import { supabaseServidor } from "./supabase/servidor";
import type { Perfil } from "./tipos";

/**
 * Usuário logado + perfil. A identidade sempre vem do token da sessão,
 * nunca de um id enviado pelo cliente.
 */
export async function exigirPerfil() {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).single<Perfil>();
  if (!perfil) redirect("/login?erro=sem-perfil");

  return { supabase, perfil };
}
