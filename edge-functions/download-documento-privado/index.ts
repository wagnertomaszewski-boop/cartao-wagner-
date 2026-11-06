// RASCUNHO DE HOMOLOGACAO: nao implantar sem testes e limites de requisicoes.
// Edge Function: download-documento-privado
import { createClient } from "npm:@supabase/supabase-js@2";
const base = Deno.env.get("SUPABASE_URL")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(base, secret, { auth: { persistSession: false } });
const origin = "https://wagnertomaszewski-boop.github.io";
function reply(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
  });
}
Deno.serve(async req => {
  if (req.headers.get("Origin") !== origin) return reply("Origem não autorizada.", 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization", "Vary": "Origin"
  } });
  if (req.method !== "POST") return reply("Método inválido.", 405);
  const length = Number(req.headers.get("content-length") || 0);
  if (length > 2048) return reply("Requisição grande demais.", 413);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply("Dados inválidos.", 400); }
  const chave = body.chave, respostaId = body.resposta_id, indice = body.indice;
  if (typeof chave !== "string" || !/^[a-f0-9]{64}$/.test(chave) ||
      !Number.isSafeInteger(respostaId) || Number(respostaId) < 1 ||
      !Number.isInteger(indice) || Number(indice) < 0 || Number(indice) > 19)
    return reply("Dados inválidos.", 400);
  const { data, error } = await admin.rpc("localizar_documento_privado", {
    p_chave: chave, p_resposta_id: respostaId, p_indice: indice
  });
  if (error) return reply("Consulta indisponível.", 503);
  const documento = Array.isArray(data) ? data[0] : null;
  if (!documento?.caminho) return reply("Documento não encontrado.", 404);
  const { data: signed, error: signError } = await admin.storage
    .from("documentos-respostas").createSignedUrl(documento.caminho, 60);
  if (signError || !signed?.signedUrl) return reply("Download indisponível.", 503);
  return new Response(JSON.stringify({ url: signed.signedUrl, nome: documento.nome }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
  });
});
