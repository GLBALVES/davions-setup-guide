
## IP confirmado: 147.93.112.182

O VPS está em `147.93.112.182`. Agora preciso atualizar todos os arquivos que ainda mostram `185.158.133.1` hardcoded com o IP correto do VPS.

## Arquivos a atualizar

**Frontend (substituir `185.158.133.1` → `import.meta.env.VITE_VPS_IP || "147.93.112.182"`)**

1. `src/pages/dashboard/CustomDomainDocs.tsx` — 4 ocorrências (tabela DNS e texto Cloudflare)
2. `src/pages/admin/AdminDomains.tsx` — 3 ocorrências na função `getDomainInfo`

**Edge Functions (substituir `185.158.133.1` → IP real)**

3. `supabase/functions/notify-domain-saved/index.ts` — 2 ocorrências no bloco DNS do e-mail. Também remover a mensagem "Action needed: Add this domain in the Lovable project settings" (agora é automático via Caddy).
4. `supabase/functions/help-assistant/index.ts` — 1 ocorrência na descrição do feature de Custom Domain.
5. `supabase/functions/check-domain/index.ts` — já usa `Deno.env.get("VPS_IP") || "185.158.133.1"` como fallback, mas o secret `VPS_IP` não está configurado — preciso adicionar o secret `VPS_IP = 147.93.112.182`.

**Variável de ambiente frontend**

6. `VITE_VPS_IP = 147.93.112.182` — precisa ser adicionada como build secret no workspace (a variável já é lida em `WebsiteSettings.tsx` mas retorna `"YOUR_VPS_IP"` por falta desta variável).

## Fluxo após as mudanças

```text
Fotógrafo salva domínio → app mostra "Registro A → 147.93.112.182"
                                          ↓
                       DNS propaga → Caddy recebe requisição
                                          ↓
          Caddy consulta validate-domain → banco retorna 200
                                          ↓
              Let's Encrypt emite SSL em minutos, automático ✓
```

## Detalhes técnicos

- 5 arquivos de código atualizados
- 1 secret de backend adicionado: `VPS_IP`
- 1 variável de ambiente de build: `VITE_VPS_IP` — após implementar, o usuário precisará adicionar esta variável manualmente em **Workspace Settings → Build Secrets** com valor `147.93.112.182`
- E-mails de notificação de domínio terão o IP correto e mensagem atualizada (sem mais "ação manual necessária")
