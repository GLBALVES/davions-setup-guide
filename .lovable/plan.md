## Diagnóstico

Os controles de **overlay da imagem de background** sumiram do painel `BlockSettingsPanel.tsx` em alguma edição posterior, mesmo a lógica de renderização ainda existindo em `SectionRenderer.tsx` (linhas 313-375, lendo `overlayColor` e `overlayOpacity`).

Resultado: as propriedades funcionam tecnicamente, mas não há mais UI para o usuário ajustá-las — por isso "não aparece em lugar nenhum".

## O que será feito

Reintegrar os controles de overlay no painel do editor, em dois lugares (igual estava antes):

1. **Editor de conteúdo do Hero** (`HeroContentEditor`) — logo após o `FocalPointPicker` da imagem de fundo do Hero (~linha 113).
2. **Configurações gerais de seção** (`BlockSettingsPanel`) — logo após o `FocalPointPicker` da imagem de fundo da seção (~linha 938).

Cada bloco terá:
- Seletor de cor (`<input type="color">` + input hex), padrão `#000000`.
- Slider de opacidade 0–100% (componente `Slider` do shadcn), padrão `40`.
- Só aparece quando há `backgroundImage` definida.
- Labels traduzidos via `LanguageContext` (EN / PT-BR / ES) — chaves novas: `editor.bgOverlay`, `editor.overlayColor`, `editor.overlayOpacity`.

## Detalhes técnicos

- Adicionar de volta as propriedades `overlayColor?: string` e `overlayOpacity?: number` na interface `BlockSettings` (linha 20+) — atualmente ausentes.
- Criar componente helper local `OverlayControls` em `BlockSettingsPanel.tsx` para reutilizar nos dois pontos.
- Hero: adicionar `bgOverlayColor` e `bgOverlayOpacity` ao tipo do bloco Hero e propagar para o `HeroBlock` no `SectionRenderer` (já consumidos pela lógica existente).
- Nenhuma alteração no `SectionRenderer.tsx` (lógica de renderização do overlay já está pronta).
- Nenhuma migração de banco — os dados ficam no JSONB do site.

## Arquivos afetados

- `src/components/website-editor/BlockSettingsPanel.tsx` — adicionar interface, componente `OverlayControls` e integrá-lo em 2 pontos.
- `src/lib/i18n/translations.ts` — 3 novas chaves × 3 idiomas.
- `src/components/store/SectionRenderer.tsx` — apenas garantir que o `HeroBlock` receba `bgOverlayColor`/`bgOverlayOpacity` do bloco Hero (verificar se já está passando).