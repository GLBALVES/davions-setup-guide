# Undo / Redo no Editor de Site

## Objetivo
Permitir desfazer e refazer ações no editor (`/dashboard/website/editor`) — edição de textos, blocos, cores, fontes, espaçamento, navegação, imagens e qualquer outro campo do site — usando atalhos de teclado e botões na barra superior.

## Escopo
- **Atinge:** todos os campos editáveis do site mantidos em `WebsiteSettings.tsx` (logo, tagline, cores, fontes, hero, sobre, sociais, navegação, blocos, SEO, footer, etc.).
- **Não atinge:** ações irreversíveis (publicar, apagar definitivo do Trash, upload em curso, troca de domínio, slug, ações de billing).

## Como vai funcionar (UX)
1. Atalhos globais dentro do editor:
   - **Ctrl/Cmd + Z** → desfazer
   - **Ctrl/Cmd + Shift + Z** (e **Ctrl + Y**) → refazer
2. Dois botões discretos na `PreviewHeader` (ícones Undo/Redo da lucide), desabilitados quando a pilha estiver vazia, com tooltip mostrando o atalho.
3. Toast curto ao desfazer/refazer ("Desfeito" / "Refeito").
4. As alterações desfeitas/refeitas refletem **imediatamente** no preview; o salvamento no backend continua acontecendo pelo botão "Save" existente (não auto-save por undo) — ou seja, undo/redo só mexe no estado local até o usuário salvar.

## Abordagem técnica

### 1. Consolidar estado editável em um snapshot
Criar um helper `useEditorHistory` em `src/components/website-editor/useEditorHistory.ts` que:
- Recebe um objeto serializável (snapshot) com todos os campos editáveis e seus setters agrupados.
- Mantém duas pilhas em `useRef`: `past[]` e `future[]` (limite ~50 entradas para não estourar memória).
- Expõe: `pushSnapshot()`, `undo()`, `redo()`, `canUndo`, `canRedo`, `reset(initial)`.

### 2. Snapshot serializável
Em `WebsiteSettings.tsx`, agrupar os ~60 `useState` editáveis em um único objeto derivado `currentSnapshot` (memo) e um aplicador `applySnapshot(snap)` que chama todos os setters correspondentes. Os estados de UI puros (modais abertos, "copiado", "loading", "uploading*") **não entram** no snapshot.

### 3. Captura de snapshots
Estratégia debounced para evitar uma entrada por tecla:
- Hook `useDebouncedSnapshot(currentSnapshot, 400ms)` empurra para `past[]` quando o snapshot estabiliza (diff via `JSON.stringify` rápido).
- Entrada inicial gravada no `useEffect` de carregamento.
- Limpa `future[]` a cada nova mutação do usuário (comportamento padrão de editores).

### 4. Atalhos e botões
- Hook `useUndoRedoShortcuts({ undo, redo, canUndo, canRedo })` com listener `keydown` no `window`, ignorando quando o foco está em campos `contentEditable` que já tratam undo nativo do navegador (deixar o navegador resolver o undo de digitação dentro do mesmo campo) — quando o evento não é cancelado pelo navegador, nosso handler assume.
- Adicionar dois `Button` (variant ghost) em `PreviewHeader.tsx` antes do botão Save.

### 5. Persistência
- Por padrão, history vive **apenas em memória** (resetado ao recarregar a página) — comportamento esperado para editores web.
- Opcional (não incluído nesta entrega): salvar a última pilha em `sessionStorage` para sobreviver a refresh.

## Arquivos a criar/editar

```text
src/components/website-editor/useEditorHistory.ts      [novo]
src/components/website-editor/useUndoRedoShortcuts.ts  [novo]
src/components/website-editor/PreviewHeader.tsx        [+ 2 botões]
src/pages/dashboard/WebsiteSettings.tsx                [agrupar snapshot + applySnapshot + integração]
src/lib/i18n/translations.ts                           [strings: Desfazer, Refazer, Desfeito, Refeito]
```

## Riscos & cuidados
- **Tamanho do snapshot:** o site editável é leve (campos string + arrays curtos), 50 snapshots ≈ <2MB — aceitável.
- **Inputs `contentEditable` (RichText, EditableText):** deixar o undo nativo do browser primeiro; nosso handler atua quando o foco não está em um editor de texto ativo, evitando conflito.
- **Uploads/IDs assíncronos:** snapshot é tirado após o setState de URL final; nada a fazer.
- **Idiomas:** strings em EN/PT-BR/ES (memo de i18n).

## Critério de aceite
- Editar um texto, mudar cor, mover bloco → Ctrl+Z reverte uma ação por vez na ordem inversa; Ctrl+Shift+Z refaz.
- Botões Undo/Redo na header habilitam/desabilitam corretamente.
- Funciona em Mac (Cmd) e Windows/Linux (Ctrl).
- Save continua salvando o estado atual visível.
