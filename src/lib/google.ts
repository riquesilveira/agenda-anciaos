import "server-only";

/**
 * O login com Google está ligado no Supabase? (Authentication → Providers.)
 * Enquanto não estiver, o botão não aparece. Consulta pública, guardada 5 min.
 */
export async function googleAtivo(): Promise<boolean> {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      next: { revalidate: 300 },
    });
    if (!r.ok) return false;
    const dados = (await r.json()) as { external?: { google?: boolean } };
    return dados.external?.google === true;
  } catch {
    return false;
  }
}
