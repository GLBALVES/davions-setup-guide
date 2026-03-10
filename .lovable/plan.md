
## Watermarks: Lista gerenciável com editor visual

### O que o usuário quer
- Uma **lista de watermarks** (não apenas uma) criadas e gerenciadas nas Settings
- Cada watermark tem: **nome**, **texto** (com fonte, cor, escala, opacidade, posição), **imagem** (com escala, opacidade, posição)
- Editor visual com **preview em tempo real** sobre uma foto de exemplo (referência: Pixieset)
- Na criação de galeria Proof, o fotógrafo **seleciona qual watermark** da lista aplicar

---

### Banco de dados — nova tabela `watermarks`

```sql
CREATE TABLE public.watermarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT '',
  -- TEXT layer
  text_content     text,
  text_font        text NOT NULL DEFAULT 'serif',
  text_color       text NOT NULL DEFAULT '#ffffff',
  text_opacity     numeric NOT NULL DEFAULT 0.9,
  text_scale       numeric NOT NULL DEFAULT 0.5,
  text_position    text NOT NULL DEFAULT 'center', -- 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  -- IMAGE layer
  image_url        text,
  image_opacity    numeric NOT NULL DEFAULT 0.8,
  image_scale      numeric NOT NULL DEFAULT 0.4,
  image_position   text NOT NULL DEFAULT 'center',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own watermarks"
  ON public.watermarks FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
```

`galleries.watermark_url` atual passa a ser `galleries.watermark_id` (FK para `watermarks`).

---

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `migration SQL` | CRIAR — tabela `watermarks` + policy RLS |
| `src/components/dashboard/WatermarkEditor.tsx` | CRIAR — editor visual completo com preview |
| `src/pages/dashboard/Settings.tsx` | EDITAR — substituir upload simples por lista + botão "New Watermark" que abre o editor |
| `src/components/dashboard/CreateGalleryDialog.tsx` | EDITAR — watermark passa a ser um Select da lista |
| migration adicional | EDITAR galleries — adicionar `watermark_id` uuid FK para `watermarks` |

---

### WatermarkEditor — componente

Layout em duas colunas (inspirado no Pixieset):
- **Coluna esquerda (painel de controles)**:
  - Input: Nome da watermark
  - Seção TEXT: toggle ativo/inativo, input texto, select fonte (Serif / Sans-serif / Monospace), color picker (branco/preto + hex livre), slider Scale (0–100%), slider Opacity (0–100%), grid 3×3 de posição
  - Seção IMAGE: toggle ativo/inativo, upload de imagem PNG, slider Scale, slider Opacity, grid 3×3 de posição
- **Coluna direita (preview)**:
  - Foto de fundo genérica (foto de landscape escura do unsplash ou placeholder)
  - Texto renderizado via `<canvas>` ou CSS absoluto sobre a imagem
  - Imagem renderizada como `<img>` absoluta sobre a foto
  - Atualiza em tempo real conforme os controles mudam

```
┌──────────────────┬──────────────────────────────────┐
│  Settings        │                                  │
│  ─────────────   │    [foto de fundo]                │
│  Name            │                                  │
│                  │    ╔═════════════════╗            │
│  TEXT            │    ║  Meu Estúdio    ║            │
│  [toggle]        │    ╚═════════════════╝            │
│  Text ___        │                                  │
│  Font [serif ▼]  │    [logo-watermark.png]           │
│  Color ● ●       │                                  │
│  Scale ────●──   │                                  │
│  Opacity ──●──   └──────────────────────────────────┘
│  Position [3×3]
│
│  IMAGE
│  [toggle]
│  [upload PNG]
│  Scale ────●──
│  Opacity ──●──
│  Position [3×3]
│
│  [Save]
└──────────────────
```

---

### CreateGalleryDialog — mudança

Watermark muda de um simples toggle para um **Select** que lista todas as watermarks criadas:
```
Watermark
[Select watermark...  ▼]   ← lista as watermarks do fotógrafo
```
Se não houver nenhuma, mostra mensagem "Crie uma watermark em Settings".

---

### Fluxo nas Settings

```
Galleries section
─────────────────
Watermarks                              [+ New Watermark]

┌─────────────────────────────────┐
│ My Studio Logo          [Edit] [Delete]│
│ ○ text: "Meu Estúdio"   ○ image      │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Wedding Style           [Edit] [Delete]│
└─────────────────────────────────┘
```

Clicar em "+ New Watermark" ou "Edit" abre o `WatermarkEditor` em um Dialog.
