
## Diagnóstico

A Help Center atual tem:
- Layout de coluna única sem estrutura visual clara
- Chips de categoria sem ícones (texto puro)
- Accordion básico sem hierarquia: pergunta e resposta no mesmo nível visual
- Hero sem impacto — texto, busca, chips empilhados verticalmente
- Footer CTA sem destaque
- Conteúdo pobre (sem dicas visuais, sem tags "New", sem breadcrumb dentro do artigo)

## O que vamos construir

### 1. Layout em duas colunas
Sidebar esquerda fixa com categorias (ícone + título + contagem de artigos). Coluna direita com os artigos da categoria selecionada. Em mobile colapsa para tab horizontal.

```
┌─────────────────────────────────────────────────────┐
│  HEADER                                             │
├──────────────┬──────────────────────────────────────┤
│              │  ┌─ Category header ──────────────── │
│  CATEGORIES  │  │  Icon  Title                      │
│  sidebar     │  │  Description                      │
│              │  └───────────────────────────────────│
│  • Getting   │                                      │
│    Started   │  ┌─ Article accordion ───────────── │
│    4 arts    │  │  Q: ...?          ↓               │
│              │  │  A: paragraph...                  │
│  • Sessions  │  └───────────────────────────────────│
│    6 arts    │                                      │
│              │  ┌─ Article accordion ───────────── │
│  • Galleries │  └───────────────────────────────────│
│    5 arts    │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 2. Hero redesenhado
- Título grande com gradiente sutil ou linha decorativa
- Searchbar centralizada e prominente (full width, maior)
- Stats da base de conhecimento: "X artigos · Y categorias"

### 3. Category sidebar
- Cada item: ícone + título + badge com contagem
- Item ativo: background preenchido, borda esquerda accent
- Hover com transição suave

### 4. Article accordion melhorado
- Pergunta em `text-sm` com peso normal (não font-light que some)
- Ícone de seta com animação mais generosa
- Resposta com padding confortável, texto `text-[13px]` legível
- Suporte a **bold**, listas e código inline dentro das respostas (renderização de markdown básico)
- Separador entre perguntas mais claro

### 5. Popular questions / Quick start section
- Na view "All categories" sem busca ativa: mostrar bloco de "Quick Start" no topo com os 4 artigos mais importantes fixados
- Cards com ícone da categoria pai, título da pergunta, seta →

### 6. Search melhorado
- Highlight do termo buscado dentro das perguntas/respostas
- Mostrar o nome da categoria como label acima de cada resultado
- Animação de fade ao aparecer resultados

### 7. Footer CTA refinado
- Dois botões: "Report a Bug" (abre BugReportDialog) e email de suporte
- Design com bordas e ícones, não apenas texto

## Arquivos alterados

- **`src/pages/dashboard/HelpCenter.tsx`** — reescrita completa

Sem mudanças de banco de dados. Sem novos arquivos. Uma única reescrita significativa.
