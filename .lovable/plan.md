
## Diagnóstico
`src/pages/Index.tsx` e `src/components/Navbar.tsx` têm **todos os textos hardcoded em inglês**. Nenhum dos dois usa `useLanguage()` ou o dicionário `translations.ts`. Por isso o navegador em Português não muda nada.

---

## Plano de implementação

### 1. Adicionar namespace `landing` e `navbar` em `translations.ts`
Criar chaves EN / PT / ES para todos os textos das duas páginas:

**Navbar:**
- `features`, `pricing`, `integrations`, `signIn`, `getStarted`, `dashboard`

**Landing (Index.tsx) — seções:**
- **Hero**: tag line, headline, subheadline, CTAs, trust badges
- **Features**: section label, heading, subheading, 4 feature cards (title + description + "Learn more"), tag "Key Feature"
- **Lightroom Plugin spotlight**: section label, heading, 4 bullet points, CTA "Download Plugin", status, panel labels
- **Pricing**: section label, heading, subheading, 3 planos (nome, descrição, features[], CTA)
- **CTA Banner**: tag line, heading, subheading, CTA
- **Footer**: coluna titles + links, copyright, Privacy Policy, Terms of Service

### 2. Atualizar `Navbar.tsx`
- Importar `useLanguage`
- Substituir todos os strings literais por `t.navbar.*`

### 3. Atualizar `Index.tsx`
- Importar `useLanguage`
- Mover arrays `features` e `plans` para dentro do componente (depois de `const { t } = useLanguage()`) para que reajam à mudança de idioma
- Substituir todos os strings literais por `t.landing.*`

### Arquivos alterados
| Arquivo | Mudança |
|---|---|
| `src/lib/i18n/translations.ts` | +namespace `landing` + `navbar` em EN, PT, ES |
| `src/components/Navbar.tsx` | Conectar ao `useLanguage`, strings → chaves i18n |
| `src/pages/Index.tsx` | Conectar ao `useLanguage`, arrays movidos para dentro do componente, strings → chaves i18n |
