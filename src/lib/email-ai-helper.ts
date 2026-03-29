import { supabase } from "@/integrations/supabase/client";

export async function chamarIA(systemPrompt: string, userPrompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("email-ai", {
    body: { action: "ai", systemPrompt, userPrompt },
  });
  if (error) throw new Error(error.message || "Erro ao chamar IA");
  if (data?.error) throw new Error(data.error);
  return data?.content || "";
}
