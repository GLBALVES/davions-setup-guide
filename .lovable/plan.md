

## Corrigir vídeos "corrompidos" nos Bug Reports

### Diagnóstico
Os arquivos de vídeo estão íntegros no storage (H.264 MP4 válidos). O problema é que os elementos `<video>` no código não possuem os atributos necessários para carregar vídeos de origens externas (Supabase Storage). O navegador exibe "arquivo corrompido" porque falham ao tentar carregar o vídeo via cross-origin sem as permissões adequadas.

### Correção

**Arquivo:** `src/pages/admin/AdminBugReports.tsx`

Em todas as tags `<video>` (linhas ~244, ~376), adicionar:
- `crossOrigin="anonymous"` — permite ao navegador carregar o vídeo cross-origin
- `preload="metadata"` — carrega apenas metadados inicialmente (evita timeout em vídeos grandes)
- `playsInline` — melhora reprodução em dispositivos móveis

Há 3 instâncias de `<video>` no arquivo:
1. Linha ~244: vídeo inline na lista expandida (desktop)
2. Linha ~376: vídeo inline na lista expandida (mobile/compacta)  
3. Lightbox (se existente) — verificar e corrigir também

Alterar de:
```tsx
<video src={url} controls className="..." />
```
Para:
```tsx
<video src={url} controls crossOrigin="anonymous" preload="metadata" playsInline className="..." />
```

### Detalhes técnicos
- O Storage retorna `Access-Control-Allow-Origin: *` nos headers, então `crossOrigin="anonymous"` funcionará
- `preload="metadata"` evita que vídeos grandes (até 54MB detectados) causem timeout de carregamento
- A correção será aplicada em todas as instâncias de `<video>` no `AdminBugReports.tsx`

