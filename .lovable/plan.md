## Problema

Em `InlineFormatToolbar.tsx`, ao selecionar vários parágrafos dentro de um bloco "Text" e escolher um preset no dropdown de estilo (ex.: Banner Heading, H1, Paragraph 2), apenas o primeiro parágrafo é transformado. Os demais permanecem com a tipografia antiga.

## Causa

A função `onApplyBlock` usa `document.execCommand("formatBlock", ...)` no caminho "rich-text host". Esse comando do navegador só altera o bloco que contém o início da seleção — ele não itera sobre múltiplos blocos cobertos pela seleção. Por isso só o 1º `<p>` vira `<h1>` / recebe `data-site-typo`.

## Correção

Reescrever `onApplyBlock` (apenas o ramo `isRichTextHost`) para coletar **todos os elementos de bloco** que interceptam a seleção atual e transformar cada um deles individualmente.

### Algoritmo

1. Obter `range = selection.getRangeAt(0)`.
2. Coletar todos os blocos descendentes diretos/indiretos do `host` cujo conteúdo intercepta o range. Considerar tags de bloco: `P, H1, H2, H3, H4, H5, H6, BLOCKQUOTE, DIV, LI`. Usar `TreeWalker` filtrando por essas tags e `range.intersectsNode(node)`.
3. Se a lista estiver vazia, cair no comportamento atual (`execSimple("formatBlock", ...)`).
4. Para cada bloco coletado:
   - Criar um novo elemento com a tag-alvo (`ELEMENT_TO_TAG[key]`).
   - Mover `childNodes` do bloco original para o novo elemento.
   - Definir `data-site-typo="<key>"` no novo elemento.
   - Remover as propriedades inline conflitantes (`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`) — mesma limpeza já feita hoje.
   - Substituir (`replaceWith`) o bloco original pelo novo.
5. Restaurar a seleção cobrindo do primeiro ao último bloco transformado (`setStartBefore` / `setEndAfter`) para que o toolbar permaneça posicionado e o usuário possa encadear outras ações.
6. `host.normalize()` + `fireInput(host)`.

O ramo "single-line host" (quando `host.tagName !== 'DIV'`) permanece inalterado — nesse caso o host é o próprio bloco e a seleção múltipla de parágrafos não se aplica.

## Arquivo afetado

- `src/components/website-editor/inline/InlineFormatToolbar.tsx` — substituir o corpo do bloco `if (isRichTextHost) { ... }` dentro de `onApplyBlock`.

## Validação

1. Selecionar 3 parágrafos em um bloco Text e aplicar "Banner Heading" → todos os 3 viram H1 com `data-site-typo="banner_heading"`.
2. Selecionar mistura de H2 + P e aplicar "Paragraph 2" → ambos viram `<p data-site-typo="paragraph_2">`.
3. Seleção dentro de um único parágrafo continua funcionando como antes.
4. Build passa sem erros.
