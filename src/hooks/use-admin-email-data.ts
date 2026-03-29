import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
type ServerConfig = { ativo: boolean; servidor: string; porta: number; seguranca: "ssl" | "starttls" | "nenhuma"; usuario: string; senha: string };
type Conta = { id: string; nome: string; email: string; cor: string; assinatura: string; padrao: boolean; provedor: "gmail" | "outlook" | "yahoo" | "icloud" | "hotmail" | "custom"; imap: ServerConfig; smtp: ServerConfig };
type Prioridade = "urgente" | "alta" | "normal" | "baixa";
type PastaRegra = { tipo: "remetente" | "assunto" | "tag"; valor: string };
type Pasta = { id: string; nome: string; icone: string; cor: string; regras: PastaRegra[]; emailIds: string[] };
type Assinatura = { id: string; nome: string; conteudo: string; contaIds: string[] };
type RegraSegmentacao = { id: string; seTipo: string; seValor: string; entaoTipo: string; entaoValor: string };
type Preferencias = { marcarAoAbrir: boolean; mostrarPreview: boolean; notificacoes: boolean; emailsPorPagina: number; idiomaIA: string };
type RespostaAutomatica = { ativa: boolean; assunto: string; mensagem: string; de: string; ate: string; apenasConhecidos: boolean };

type EmailBase = {
  id: string; assunto: string; preview: string; corpo: string; hora: string; data: string;
  lido: boolean; favorito: boolean; prioridade: Prioridade; tags: string[]; pasta: string | null; contaId: string;
};
type EmailRecebido = EmailBase & { tipo: "recebido"; remetente: string; emailRemetente: string };
type EmailEnviado = EmailBase & { tipo: "enviado"; remetente: string; emailRemetente: string; destinatario: string; emailDestinatario: string; status: "entregue" | "aguardando" };
type EmailSpam = EmailBase & { tipo: "spam"; remetente: string; emailRemetente: string; motivoSpam: string };
type EmailArquivo = EmailBase & { tipo: "arquivo"; remetente: string; emailRemetente: string };
type EmailType = EmailRecebido | EmailEnviado | EmailSpam | EmailArquivo;

type Template = { id: string; nome: string; categoria: string; assunto: string; corpo: string; tom: "formal" | "casual"; criadoPorIA: boolean; criadoEm: Date; usos: number };
type GrupoContato = { nome: string; email: string };
type Grupo = { id: string; nome: string; contatos: GrupoContato[] };

/* ─── DB row to app model mappers ─── */
function mapContaRow(row: any): Conta {
  return {
    id: row.id, nome: row.nome, email: row.email, cor: row.cor, assinatura: row.assinatura,
    padrao: row.padrao, provedor: row.provedor,
    imap: { ativo: row.imap_ativo, servidor: row.imap_servidor, porta: row.imap_porta, seguranca: row.imap_seguranca, usuario: row.imap_usuario, senha: row.imap_senha || "" },
    smtp: { ativo: row.smtp_ativo, servidor: row.smtp_servidor, porta: row.smtp_porta, seguranca: row.smtp_seguranca, usuario: row.smtp_usuario, senha: row.smtp_senha || "" },
  };
}

function mapEmailRow(row: any): EmailType {
  const base: EmailBase = {
    id: row.id, assunto: row.assunto, preview: row.preview, corpo: row.corpo,
    hora: row.hora, data: row.data, lido: row.lido, favorito: row.favorito,
    prioridade: row.prioridade as Prioridade, tags: row.tags || [], pasta: row.pasta, contaId: row.conta_id || "",
  };
  if (row.tipo === "enviado") return { ...base, tipo: "enviado", remetente: row.remetente, emailRemetente: row.email_remetente, destinatario: row.destinatario || "", emailDestinatario: row.email_destinatario || "", status: row.status || "entregue" } as EmailEnviado;
  if (row.tipo === "spam") return { ...base, tipo: "spam", remetente: row.remetente, emailRemetente: row.email_remetente, motivoSpam: row.motivo_spam || "" } as EmailSpam;
  if (row.tipo === "arquivo") return { ...base, tipo: "arquivo", remetente: row.remetente, emailRemetente: row.email_remetente } as EmailArquivo;
  return { ...base, tipo: "recebido", remetente: row.remetente, emailRemetente: row.email_remetente } as EmailRecebido;
}

function mapPastaRow(row: any): Pasta {
  return { id: row.id, nome: row.nome, icone: row.icone, cor: row.cor, regras: (row.regras as PastaRegra[]) || [], emailIds: row.email_ids || [] };
}

function mapTemplateRow(row: any): Template {
  return { id: row.id, nome: row.nome, categoria: row.categoria, assunto: row.assunto, corpo: row.corpo, tom: row.tom, criadoPorIA: row.criado_por_ia, criadoEm: new Date(row.criado_em), usos: row.usos };
}

/* ─── Hook ─── */
export function useAdminEmailData() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [emails, setEmails] = useState<EmailType[]>([]);
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [regrasSegmentacao, setRegrasSegmentacao] = useState<RegraSegmentacao[]>([]);
  const [preferencias, setPreferencias] = useState<Preferencias>({ marcarAoAbrir: true, mostrarPreview: true, notificacoes: true, emailsPorPagina: 25, idiomaIA: "Português" });
  const [respostaAutomatica, setRespostaAutomatica] = useState<RespostaAutomatica>({ ativa: false, assunto: "", mensagem: "", de: "", ate: "", apenasConhecidos: false });
  const [bloqueados, setBloqueados] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        const [contasRes, emailsRes, pastasRes, assinaturasRes, templatesRes, gruposRes, contatosRes, regrasRes, prefsRes, bloqRes] = await Promise.all([
          supabase.from("email_contas").select("*"),
          supabase.from("email_emails").select("*"),
          supabase.from("email_pastas").select("*"),
          supabase.from("email_assinaturas").select("*"),
          supabase.from("email_templates").select("*"),
          supabase.from("email_grupos").select("*"),
          supabase.from("email_grupo_contatos").select("*"),
          supabase.from("email_regras_segmentacao").select("*"),
          supabase.from("email_preferencias").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("email_bloqueados").select("email"),
        ]);

        if (contasRes.data) setContas(contasRes.data.map(mapContaRow));
        if (emailsRes.data) setEmails(emailsRes.data.map(mapEmailRow));
        if (pastasRes.data) setPastas(pastasRes.data.map(mapPastaRow));
        if (assinaturasRes.data) setAssinaturas(assinaturasRes.data.map((r: any) => ({ id: r.id, nome: r.nome, conteudo: r.conteudo, contaIds: r.conta_ids || [] })));
        if (templatesRes.data) setTemplates(templatesRes.data.map(mapTemplateRow));
        if (regrasRes.data) setRegrasSegmentacao(regrasRes.data.map((r: any) => ({ id: r.id, seTipo: r.se_tipo, seValor: r.se_valor, entaoTipo: r.entao_tipo, entaoValor: r.entao_valor })));
        if (prefsRes.data) {
          const p = prefsRes.data;
          setPreferencias({ marcarAoAbrir: p.marcar_ao_abrir, mostrarPreview: p.mostrar_preview, notificacoes: p.notificacoes, emailsPorPagina: p.emails_por_pagina, idiomaIA: p.idioma_ia });
          setRespostaAutomatica({ ativa: p.resposta_auto_ativa, assunto: p.resposta_auto_assunto, mensagem: p.resposta_auto_mensagem, de: p.resposta_auto_de, ate: p.resposta_auto_ate, apenasConhecidos: p.resposta_auto_apenas_conhecidos });
        }
        if (bloqRes.data) setBloqueados(bloqRes.data.map((r: any) => r.email));

        if (gruposRes.data && contatosRes.data) {
          const contactsByGroup: Record<string, GrupoContato[]> = {};
          contatosRes.data.forEach((c: any) => {
            if (!contactsByGroup[c.grupo_id]) contactsByGroup[c.grupo_id] = [];
            contactsByGroup[c.grupo_id].push({ nome: c.nome, email: c.email });
          });
          setGrupos(gruposRes.data.map((g: any) => ({ id: g.id, nome: g.nome, contatos: contactsByGroup[g.id] || [] })));
        }
      } catch (err) {
        console.error("Failed to load email data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ═══ Persistence helpers ═══ */
  const persistEmailUpdate = useCallback(async (id: string, updates: Record<string, any>) => {
    await supabase.from("email_emails").update(updates).eq("id", id);
  }, []);

  const persistEmailInsert = useCallback(async (email: EmailType) => {
    if (!userId) return;
    const row: any = {
      id: email.id, user_id: userId, tipo: email.tipo, remetente: email.remetente, email_remetente: email.emailRemetente,
      assunto: email.assunto, preview: email.preview, corpo: email.corpo, hora: email.hora, data: email.data,
      lido: email.lido, favorito: email.favorito, prioridade: email.prioridade, tags: email.tags,
      pasta: email.pasta, conta_id: email.contaId,
    };
    if (email.tipo === "enviado") { row.destinatario = email.destinatario; row.email_destinatario = email.emailDestinatario; row.status = email.status; }
    if (email.tipo === "spam") { row.motivo_spam = (email as EmailSpam).motivoSpam; }
    await supabase.from("email_emails").insert(row);
  }, [userId]);

  const persistEmailDelete = useCallback(async (id: string) => {
    await supabase.from("email_emails").delete().eq("id", id);
  }, []);

  const persistContaUpsert = useCallback(async (conta: Conta) => {
    if (!userId) return;
    await supabase.from("email_contas").upsert({
      id: conta.id, user_id: userId, nome: conta.nome, email: conta.email, cor: conta.cor, assinatura: conta.assinatura,
      padrao: conta.padrao, provedor: conta.provedor,
      imap_ativo: conta.imap.ativo, imap_servidor: conta.imap.servidor, imap_porta: conta.imap.porta,
      imap_seguranca: conta.imap.seguranca, imap_usuario: conta.imap.usuario, imap_senha: conta.imap.senha,
      smtp_ativo: conta.smtp.ativo, smtp_servidor: conta.smtp.servidor, smtp_porta: conta.smtp.porta,
      smtp_seguranca: conta.smtp.seguranca, smtp_usuario: conta.smtp.usuario, smtp_senha: conta.smtp.senha,
    });
  }, [userId]);

  const persistContaDelete = useCallback(async (id: string) => {
    await supabase.from("email_contas").delete().eq("id", id);
  }, []);

  const persistPastaUpsert = useCallback(async (pasta: Pasta) => {
    if (!userId) return;
    await supabase.from("email_pastas").upsert({
      id: pasta.id, user_id: userId, nome: pasta.nome, icone: pasta.icone, cor: pasta.cor,
      regras: pasta.regras as any, email_ids: pasta.emailIds,
    });
  }, [userId]);

  const persistPastaDelete = useCallback(async (id: string) => {
    await supabase.from("email_pastas").delete().eq("id", id);
  }, []);

  const persistAssinaturaUpsert = useCallback(async (assinatura: Assinatura) => {
    if (!userId) return;
    await supabase.from("email_assinaturas").upsert({
      id: assinatura.id, user_id: userId, nome: assinatura.nome, conteudo: assinatura.conteudo, conta_ids: assinatura.contaIds,
    });
  }, [userId]);

  const persistTemplateUpsert = useCallback(async (template: Template) => {
    if (!userId) return;
    await supabase.from("email_templates").upsert({
      id: template.id, user_id: userId, nome: template.nome, categoria: template.categoria, assunto: template.assunto,
      corpo: template.corpo, tom: template.tom, criado_por_ia: template.criadoPorIA,
      criado_em: template.criadoEm.toISOString(), usos: template.usos,
    });
  }, [userId]);

  const persistTemplateDelete = useCallback(async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
  }, []);

  const persistGrupoUpsert = useCallback(async (grupo: Grupo) => {
    await supabase.from("email_grupos").upsert({ id: grupo.id, nome: grupo.nome });
    await supabase.from("email_grupo_contatos").delete().eq("grupo_id", grupo.id);
    if (grupo.contatos.length > 0) {
      await supabase.from("email_grupo_contatos").insert(grupo.contatos.map(c => ({ grupo_id: grupo.id, nome: c.nome, email: c.email })));
    }
  }, []);

  const persistGrupoDelete = useCallback(async (id: string) => {
    await supabase.from("email_grupos").delete().eq("id", id);
  }, []);

  const persistRegraUpsert = useCallback(async (regra: RegraSegmentacao) => {
    await supabase.from("email_regras_segmentacao").upsert({
      id: regra.id, se_tipo: regra.seTipo, se_valor: regra.seValor, entao_tipo: regra.entaoTipo, entao_valor: regra.entaoValor,
    });
  }, []);

  const persistRegraDelete = useCallback(async (id: string) => {
    await supabase.from("email_regras_segmentacao").delete().eq("id", id);
  }, []);

  const persistPreferencias = useCallback(async (prefs: Preferencias, resp: RespostaAutomatica) => {
    if (!userId) return;
    await supabase.from("email_preferencias").upsert({
      id: userId,
      user_id: userId as any,
      marcar_ao_abrir: prefs.marcarAoAbrir, mostrar_preview: prefs.mostrarPreview,
      notificacoes: prefs.notificacoes, emails_por_pagina: prefs.emailsPorPagina, idioma_ia: prefs.idiomaIA,
      resposta_auto_ativa: resp.ativa, resposta_auto_assunto: resp.assunto, resposta_auto_mensagem: resp.mensagem,
      resposta_auto_de: resp.de, resposta_auto_ate: resp.ate, resposta_auto_apenas_conhecidos: resp.apenasConhecidos,
    });
  }, [userId]);

  const persistBloqueado = useCallback(async (email: string) => {
    await supabase.from("email_bloqueados").insert({ email });
  }, []);

  return {
    loading, userId,
    contas, setContas,
    emails, setEmails,
    pastas, setPastas,
    assinaturas, setAssinaturas,
    templates, setTemplates,
    grupos, setGrupos,
    regrasSegmentacao, setRegrasSegmentacao,
    preferencias, setPreferencias,
    respostaAutomatica, setRespostaAutomatica,
    bloqueados, setBloqueados,
    persistEmailUpdate, persistEmailInsert, persistEmailDelete,
    persistContaUpsert, persistContaDelete,
    persistPastaUpsert, persistPastaDelete,
    persistAssinaturaUpsert,
    persistTemplateUpsert, persistTemplateDelete,
    persistGrupoUpsert, persistGrupoDelete,
    persistRegraUpsert, persistRegraDelete,
    persistPreferencias,
    persistBloqueado,
  };
}
