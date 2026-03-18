
## Contexto

O usuário enviou screenshot mostrando o DNS do Cloudflare para `booking.giombelli.com.br`. Os registros estão **corretos**:
- A record: `booking` → `185.158.133.1` → **Somente DNS** ✅
- TXT record: `_davions` → `davions_verify=...` → **Somente DNS** ✅

O Error 1000 foi causado pelo proxy do Cloudflare estar ativado. Agora que está desativado, a configuração está correta. O domínio deve funcionar após propagação do DNS.

## O que melhorar

A UI atual na seção "Custom Domain" do `WebsiteSettings.tsx` (linha 822–827) tem apenas um aviso genérico sobre registros conflitantes. Falta um aviso específico e proeminente para usuários do **Cloudflare** explicando o erro mais comum: o proxy (nuvem laranja) precisa estar **desativado** (nuvem cinza / DNS only).

Também deve ser adicionado o mesmo aviso na seção equivalente do `CustomDomainDocs.tsx` (Step 2).

## Plano

### 1. `src/pages/dashboard/WebsiteSettings.tsx` — Seção Custom Domain (linhas 820–827)

Substituir o aviso genérico existente por dois blocos:
1. Aviso genérico (existente, mantido)
2. **Novo bloco amarelo/âmbar** específico para Cloudflare:
   ```
   ⚠️ Usando Cloudflare? Certifique-se de que o "Status do Proxy" do registro A 
   esteja como "Somente DNS" (nuvem cinza), não "Proxied" (nuvem laranja). 
   Deixar o proxy ativo causa o Error 1000 e impede o domínio de funcionar.
   ```

### 2. `src/pages/dashboard/CustomDomainDocs.tsx` — Step 2, após a tabela DNS (linhas 204–219)

Adicionar o mesmo bloco de aviso para Cloudflare junto ao aviso de registros conflitantes já existente.

### Arquivo único com maior impacto: `WebsiteSettings.tsx`

A alteração é cirúrgica: substituir ~6 linhas na seção Custom Domain para adicionar o novo bloco de aviso Cloudflare.

```
Antes (linha 822-827):
<div className="flex items-start gap-2 p-3 border border-border bg-muted/10">
  <AlertCircle ... />
  <p>Remove any conflicting A or CNAME records...</p>
</div>

Depois:
<div ...> (aviso conflito — mantido) </div>
<div className="flex items-start gap-2 p-3 border border-amber-500/20 bg-amber-500/5">
  <AlertTriangle className="h-3 w-3 text-amber-500 ..." />
  <p>...Cloudflare: desative o proxy (DNS only / nuvem cinza)...</p>
</div>
```

Total: 2 arquivos, ~15 linhas adicionadas.
