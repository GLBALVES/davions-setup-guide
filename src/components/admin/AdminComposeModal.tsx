import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  X, Minus, Maximize2, Paperclip, Send, Save,
  Bold, Italic, Underline, Strikethrough, Quote,
  List, ListOrdered, Link, Image, AlignLeft, AlignCenter, AlignRight,
  Palette, Sparkles, RefreshCw, Globe, Loader2, Mail,
  Heading1, Heading2, ChevronDown, FileText, SendHorizonal,
  Pencil, Plus, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { chamarIA } from "@/lib/email-ai-helper";

declare global {
  interface Window { Quill: any; }
}

export type ComposeConta = {
  id: string;
  nome: string;
  email: string;
  cor: string;
  assinatura: string;
};

export type ComposeAssinatura = {
  id: string;
  nome: string;
  conteudo: string;
  contaIds: string[];
};

export interface ComposeModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  mode: "responder" | "encaminhar" | "novo";
  initialPara: string[];
  initialAssunto: string;
  initialCorpo: string;
  autoGenerateAI: boolean;
  selectedEmail: { remetente: string; emailRemetente: string; assunto: string; corpo: string } | null;
  contas: ComposeConta[];
  contaAtiva: string;
  onClose: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  onSend: (data: { para: string[]; cc: string[]; cco: string[]; assunto: string; corpo: string; contaId: string }) => void;
  onSaveDraft: () => void;
  assinaturas?: ComposeAssinatura[];
  onSelecionarAssinatura?: (conteudo: string) => void;
  onEditarAssinatura?: (assinatura: ComposeAssinatura) => void;
  onCriarAssinatura?: () => void;
}

const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen, isMinimized, mode, initialPara, initialAssunto, initialCorpo,
  autoGenerateAI, selectedEmail, contas, contaAtiva,
  onClose, onMinimize, onExpand, onSend, onSaveDraft,
  assinaturas = [], onSelecionarAssinatura, onEditarAssinatura, onCriarAssinatura,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation("email");
  const [modalAssinaturasAberto, setModalAssinaturasAberto] = useState(false);

  const [para, setPara] = useState<string[]>(initialPara);
  const [paraInput, setParaInput] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [cco, setCco] = useState<string[]>([]);
  const [ccoInput, setCcoInput] = useState("");
  const [showCco, setShowCco] = useState(false);
  const [assunto, setAssunto] = useState(initialAssunto);
  const [tonIA, setTonIA] = useState<"formal" | "casual">("formal");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [carregandoIA, setCarregandoIA] = useState(false);
  const [carregandoMelhoria, setCarregandoMelhoria] = useState(false);
  const [anexos, setAnexos] = useState(0);
  const [quillReady, setQuillReady] = useState(false);
  const [aiAutoTriggered, setAiAutoTriggered] = useState(false);
  const [assinaturaAtiva, setAssinaturaAtiva] = useState<string | null>(null);

  const defaultContaId = contaAtiva !== "todas" ? contaAtiva : (contas.find(c => (c as any).padrao)?.id || contas[0]?.id || "");
  const [selectedContaId, setSelectedContaId] = useState(defaultContaId);
  const selectedConta = contas.find(c => c.id === selectedContaId) || contas[0];

  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPara(initialPara);
      setParaInput("");
      setCc([]);
      setCcInput("");
      setShowCc(false);
      setCco([]);
      setCcoInput("");
      setShowCco(false);
      setAssunto(initialAssunto);
      setCarregandoIA(false);
      setCarregandoMelhoria(false);
      setAnexos(0);
      setShowDiscardConfirm(false);
      setQuillReady(false);
      setAiAutoTriggered(false);
      setSelectedContaId(defaultContaId);
      if (quillRef.current) {
        quillRef.current = null;
      }
    }
  }, [isOpen, initialPara, initialAssunto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return;
    const loadQuill = () => {
      if (!document.querySelector('link[href*="quill.snow"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.css";
        document.head.appendChild(link);
      }
      if (window.Quill) {
        initQuill();
      } else if (!document.querySelector('script[src*="quill.min"]')) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
        script.onload = () => setTimeout(initQuill, 50);
        document.body.appendChild(script);
      } else {
        const check = setInterval(() => {
          if (window.Quill) { clearInterval(check); initQuill(); }
        }, 100);
        return () => clearInterval(check);
      }
    };
    const initQuill = () => {
      if (!editorRef.current || quillRef.current) return;
      const q = new window.Quill(editorRef.current, {
        theme: "snow",
        modules: { toolbar: false },
        placeholder: t('compose.placeholder'),
      });
      quillRef.current = q;
      if (initialCorpo) q.clipboard.dangerouslyPasteHTML(0, initialCorpo);
      setQuillReady(true);
    };
    const timer = setTimeout(loadQuill, 100);
    return () => clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoGenerateAI && quillReady && !aiAutoTriggered && isOpen && !isMinimized) {
      setAiAutoTriggered(true);
      handleGerarIA();
    }
  }, [autoGenerateAI, quillReady, aiAutoTriggered, isOpen, isMinimized]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatText = useCallback((format: string, value?: any) => {
    const q = quillRef.current;
    if (!q) return;
    const current = q.getFormat();
    q.format(format, value !== undefined ? value : !current[format]);
  }, []);

  const addEmailToPill = (input: string, field: string[], setField: React.Dispatch<React.SetStateAction<string[]>>, setInput: React.Dispatch<React.SetStateAction<string>>) => {
    const emails = input.split(",").map(e => e.trim()).filter(e => e && e.includes("@"));
    if (emails.length > 0) {
      setField([...field, ...emails.filter(e => !field.includes(e))]);
      setInput("");
    }
  };

  const removeEmailPill = (email: string, field: string[], setField: React.Dispatch<React.SetStateAction<string[]>>) => {
    setField(field.filter(e => e !== email));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent, input: string, field: string[], setField: React.Dispatch<React.SetStateAction<string[]>>, setInput: React.Dispatch<React.SetStateAction<string>>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmailToPill(input, field, setField, setInput);
    }
  };

  const handleGerarIA = useCallback(async () => {
    if (!selectedEmail || carregandoIA) return;
    setCarregandoIA(true);
    try {
      const systemPrompt = `Você é um assistente de email profissional. Escreva uma resposta completa em português ao email fornecido. Tom: ${tonIA === "formal" ? "profissional e formal" : "casual e amigável"}. Retorne APENAS o texto da resposta, sem assunto, sem explicações adicionais. Comece diretamente com a saudação.`;
      const userPrompt = `Email original de ${selectedEmail.remetente}:\nAssunto: ${selectedEmail.assunto}\n\n${selectedEmail.corpo}`;
      const resposta = await chamarIA(systemPrompt, userPrompt);
      if (quillRef.current) {
        quillRef.current.setText("");
        quillRef.current.clipboard.dangerouslyPasteHTML(0, resposta.replace(/\n/g, "<br>"));
      }
    } catch (err) {
      toast({ title: t('toast.errorGenerateAI'), description: err instanceof Error ? err.message : "", variant: "destructive", duration: 3000 });
    } finally {
      setCarregandoIA(false);
    }
  }, [selectedEmail, tonIA, carregandoIA, toast, t]);

  const handleMelhorarTexto = useCallback(async () => {
    const q = quillRef.current;
    if (!q || carregandoMelhoria) return;
    const texto = q.getText().trim();
    if (!texto) return;
    setCarregandoMelhoria(true);
    try {
      const systemPrompt = `Melhore o texto deste email mantendo a intenção original. Corrija gramática, melhore clareza e tom ${tonIA === "formal" ? "profissional" : "casual"}. Retorne apenas o texto melhorado, sem explicações.`;
      const resposta = await chamarIA(systemPrompt, texto);
      q.setText("");
      q.clipboard.dangerouslyPasteHTML(0, resposta.replace(/\n/g, "<br>"));
    } catch (err) {
      toast({ title: t('toast.errorImproveText'), variant: "destructive", duration: 3000 });
    } finally {
      setCarregandoMelhoria(false);
    }
  }, [tonIA, carregandoMelhoria, toast, t]);

  const handleTraduzir = useCallback(async (idioma: string) => {
    const q = quillRef.current;
    if (!q) return;
    const texto = q.getText().trim();
    if (!texto) return;
    setCarregandoIA(true);
    try {
      const resposta = await chamarIA(`Traduza o seguinte texto de email para ${idioma}. Mantenha o tom e formatação. Retorne apenas o texto traduzido.`, texto);
      q.setText("");
      q.clipboard.dangerouslyPasteHTML(0, resposta.replace(/\n/g, "<br>"));
    } catch (err) {
      toast({ title: t('toast.errorTranslate'), variant: "destructive", duration: 3000 });
    } finally {
      setCarregandoIA(false);
    }
  }, [toast, t]);

  const handleCloseAttempt = useCallback(() => {
    const content = quillRef.current?.getText()?.trim() || "";
    if (content) setShowDiscardConfirm(true);
    else onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const modeTitle = mode === "responder" ? t('compose.reply') : mode === "encaminhar" ? t('compose.forward') : t('compose.newMessage');

  const renderEmailField = (label: string, field: string[], setField: React.Dispatch<React.SetStateAction<string[]>>, input: string, setInput: React.Dispatch<React.SetStateAction<string>>) => (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <span className="text-xs text-muted-foreground w-10 shrink-0">{label}</span>
      <div className="flex-1 flex items-center flex-wrap gap-1 min-h-[32px]">
        {field.map(email => (
          <span key={email} className="inline-flex items-center gap-1 text-[11px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {email}
            <button onClick={() => removeEmailPill(email, field, setField)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
          </span>
        ))}
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => handleEmailKeyDown(e, input, field, setField, setInput)} onBlur={() => addEmailToPill(input, field, setField, setInput)} placeholder="email@exemplo.com" className="flex-1 min-w-[120px] h-7 text-xs border-0 shadow-none focus-visible:ring-0 p-0" />
      </div>
    </div>
  );

  const ToolbarButton: React.FC<{ onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }> = ({ onClick, active, children, title }) => (
    <button onClick={onClick} title={title} className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors hover:bg-secondary ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{children}</button>
  );
  const ToolbarSep = () => <div className="w-px h-5 bg-border mx-0.5" />;

  return (
    <>
      <div className={isMinimized ? "hidden" : ""}>
        <div className="fixed inset-0 z-50 bg-black/50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="w-[75%] max-w-[960px] h-[80%] max-h-[720px] bg-background border border-border rounded-lg shadow-2xl flex flex-col pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="text-sm font-medium">{modeTitle}</h3>
              <div className="flex items-center gap-1">
                <button onClick={onMinimize} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title={t('common.minimize')}><Minus className="w-4 h-4" /></button>
                <button onClick={handleCloseAttempt} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title={t('common.close')}><X className="w-4 h-4" /></button>
              </div>
            </div>

            {/* EMAIL FIELDS */}
            <div className="shrink-0 border-b border-border">
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="text-xs text-muted-foreground w-10 shrink-0">{t('compose.from')}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-secondary transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedConta?.cor || "#888" }} />
                      <span className="font-medium">{selectedConta?.nome}</span>
                      <span className="text-muted-foreground">&lt;{selectedConta?.email}&gt;</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {contas.map(c => (
                      <DropdownMenuItem key={c.id} onClick={() => setSelectedContaId(c.id)}>
                        <span className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.cor }} />
                        <span className="font-medium mr-1">{c.nome}</span>
                        <span className="text-muted-foreground text-xs">{c.email}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {renderEmailField(t('compose.to'), para, setPara, paraInput, setParaInput)}
              {showCc && renderEmailField(t('compose.cc') + ":", cc, setCc, ccInput, setCcInput)}
              {showCco && renderEmailField(t('compose.bcc') + ":", cco, setCco, ccoInput, setCcoInput)}
              <div className="flex items-center gap-2 px-4 py-1">
                {!showCc && <button onClick={() => setShowCc(true)} className="text-[10px] text-muted-foreground hover:text-foreground underline">{t('compose.cc')}</button>}
                {!showCco && <button onClick={() => setShowCco(true)} className="text-[10px] text-muted-foreground hover:text-foreground underline">{t('compose.bcc')}</button>}
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <span className="text-xs text-muted-foreground w-10 shrink-0">{t('compose.subject')}</span>
                <Input value={assunto} onChange={e => setAssunto(e.target.value)} className="flex-1 h-7 text-xs border-0 shadow-none focus-visible:ring-0 p-0" />
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="shrink-0 border-b border-border px-3 py-1.5 space-y-1">
              <div className="flex items-center gap-0.5 flex-wrap">
                <ToolbarButton onClick={() => formatText("bold")} title="Negrito"><Bold className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("italic")} title="Itálico"><Italic className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("underline")} title="Sublinhado"><Underline className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("strike")} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarSep />
                <ToolbarButton onClick={() => formatText("header", 1)} title="H1"><Heading1 className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("header", 2)} title="H2"><Heading2 className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarSep />
                <ToolbarButton onClick={() => formatText("blockquote")} title="Citação"><Quote className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("list", "bullet")} title="Lista"><List className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("list", "ordered")} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarSep />
                <ToolbarButton onClick={() => { const url = prompt("URL do link:"); if (url) formatText("link", url); }} title="Link"><Link className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => { const url = prompt("URL da imagem:"); if (url && quillRef.current) { const range = quillRef.current.getSelection(true); quillRef.current.insertEmbed(range.index, "image", url); } }} title="Imagem"><Image className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarSep />
                <ToolbarButton onClick={() => formatText("align", "")} title="Esquerda"><AlignLeft className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("align", "center")} title="Centro"><AlignCenter className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarButton onClick={() => formatText("align", "right")} title="Direita"><AlignRight className="w-3.5 h-3.5" /></ToolbarButton>
                <ToolbarSep />
                <ToolbarButton onClick={() => { const c = prompt("Cor (hex):", "#000000"); if (c) formatText("color", c); }} title="Cor"><Palette className="w-3.5 h-3.5" /></ToolbarButton>
              </div>
              <div className="flex items-center gap-1 flex-wrap bg-secondary/50 rounded px-2 py-1">
                <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1.5" onClick={handleGerarIA} disabled={carregandoIA}>
                  {carregandoIA ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {t('compose.generateWithAI')}
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1.5" onClick={handleMelhorarTexto} disabled={carregandoMelhoria}>
                  {carregandoMelhoria ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} {t('compose.improveText')}
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <span className="text-[10px] text-muted-foreground">{t('compose.tone')}</span>
                <button onClick={() => setTonIA(t2 => t2 === "formal" ? "casual" : "formal")} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${tonIA === "formal" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {tonIA === "formal" ? t('compose.formal') : t('compose.casual')}
                </button>
                <div className="w-px h-4 bg-border mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1.5"><Globe className="w-3.5 h-3.5" /> {t('compose.translate')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleTraduzir("Inglês")}>{t('compose.english')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTraduzir("Espanhol")}>{t('compose.spanish')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTraduzir("Francês")}>{t('compose.french')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* EDITOR */}
            <div className="flex-1 relative overflow-auto">
              {(carregandoIA || carregandoMelhoria) && (
                <div className="absolute inset-0 z-10 bg-background/60 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{carregandoIA ? t('compose.generatingAI') : t('compose.improvingText')}</span>
                </div>
              )}
              {!quillReady && (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /><Skeleton className="h-4 w-2/3" />
                </div>
              )}
              <div ref={editorRef} className="min-h-[280px]" />
            </div>

            {/* SIGNATURE */}
            <div className="shrink-0 border-t border-dashed border-border px-4 py-2">
              <p className="text-[11px] text-muted-foreground whitespace-pre-line">
                -- {"\n"}{selectedConta?.assinatura || t('compose.defaultSignature')}
              </p>
              <button onClick={() => setModalAssinaturasAberto(true)} className="text-[10px] text-muted-foreground underline hover:text-foreground mt-1">
                {t('signaturesModal.editSignatureLink')}
              </button>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}><Paperclip className="w-3.5 h-3.5" /> {t('compose.attach')}</Button>
                <span className="text-[10px] text-muted-foreground">{anexos} {t('compose.attachments')}</span>
                <input ref={fileInputRef} type="file" className="hidden" multiple onChange={e => { if (e.target.files) setAnexos(prev => prev + e.target.files!.length); e.target.value = ""; }} />
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCloseAttempt}>{t('compose.discard')}</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { onSaveDraft(); toast({ title: t('toast.draftSaved'), duration: 3000 }); }}><Save className="w-3.5 h-3.5" /> {t('compose.saveDraft')}</Button>
                <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => {
                  const corpo = quillRef.current?.root?.innerHTML || quillRef.current?.getText()?.trim() || "";
                  if (!corpo || corpo === "<p><br></p>") {
                    toast({ title: t('compose.emptyBody') || "O corpo do email não pode estar vazio", variant: "destructive", duration: 3000 });
                    return;
                  }
                  onSend({ para, cc, cco, assunto, corpo, contaId: selectedContaId });
                }}><SendHorizonal className="w-3.5 h-3.5" /> {t('compose.send')}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MINIMIZED BAR */}
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 w-[280px] h-[44px] bg-primary text-primary-foreground rounded-lg shadow-xl flex items-center px-3 gap-2 cursor-pointer">
          <Mail className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate flex-1">{assunto || t('compose.newEmail')}</span>
          <button onClick={onExpand} className="p-1 hover:bg-primary-foreground/20 rounded" title={t('common.expand')}><Maximize2 className="w-3.5 h-3.5" /></button>
          <button onClick={onClose} className="p-1 hover:bg-primary-foreground/20 rounded" title={t('common.close')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* DISCARD CONFIRMATION */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('compose.discardDraft')}</AlertDialogTitle>
            <AlertDialogDescription>{t('compose.discardWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowDiscardConfirm(false); onClose(); }}>{t('compose.discard')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SIGNATURE SELECTION MODAL */}
      <Dialog open={modalAssinaturasAberto} onOpenChange={setModalAssinaturasAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5"><PenLine className="w-4 h-4" /> {t('settings.signatures')}</DialogTitle>
          </DialogHeader>
          {assinaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <PenLine className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('signaturesModal.noSignatures')}</p>
              {onCriarAssinatura && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setModalAssinaturasAberto(false); onCriarAssinatura(); }}>
                  <Plus className="w-3.5 h-3.5" /> {t('signaturesModal.createNew')}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <div className="space-y-2">
                {assinaturas.map(a => (
                  <div key={a.id} className="p-3 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors" onClick={() => {
                    onSelecionarAssinatura?.(a.conteudo);
                    // Inject signature HTML into Quill editor
                    const q = quillRef.current;
                    if (q) {
                      const len = q.getLength();
                      q.clipboard.dangerouslyPasteHTML(len - 1, "\n--\n" + a.conteudo);
                    }
                    setModalAssinaturasAberto(false);
                  }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{a.nome}</span>
                      {onEditarAssinatura && (
                        <button onClick={e => { e.stopPropagation(); setModalAssinaturasAberto(false); onEditarAssinatura(a); }} className="text-muted-foreground hover:text-foreground p-0.5">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground whitespace-pre-line line-clamp-3">{a.conteudo}</p>
                  </div>
                ))}
              </div>
              {onCriarAssinatura && (
                <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs gap-1.5" onClick={() => { setModalAssinaturasAberto(false); onCriarAssinatura(); }}>
                  <Plus className="w-3.5 h-3.5" /> {t('signaturesModal.createNew')}
                </Button>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ComposeModal;
