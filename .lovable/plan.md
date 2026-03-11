
## Tela de Agenda do Fotógrafo — Calendário Mensal, Semanal e Diário

### O que será construído

Uma nova página `/dashboard/schedule` com três modos de visualização do calendário: **Mensal**, **Semanal** e **Diário**. A tela exibe os agendamentos confirmados e pendentes do fotógrafo, com um painel lateral que abre ao clicar em qualquer agendamento para ver detalhes e agir (confirmar, cancelar, criar galeria).

### Layout Geral

```
┌─────────────────────────────────────────────────────┐
│  Schedule                          [Mes][Sem][Dia]  │
│  ← Março 2026 →                                     │
├──────────────────────────────────────────────────────┤
│  DOM  SEG  TER  QUA  QUI  SEX  SAB                  │
│   1    2    3    4    5    6    7                    │
│            [📸 João — Wedding]                       │
│   8    9   10   11   12   13   14                   │
│                      [📸 Maria — Portrait]           │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

**Vista Semanal:**  
Grade de 7 colunas com horários (eixo Y, 06h–22h) e blocos coloridos por sessão

**Vista Diária:**  
Lista de horários do dia com blocos de cada agendamento e detalhes de duração

### Dados

Os agendamentos são carregados do banco via join `bookings → sessions → session_availability`. O campo `session_availability.date` define o dia no calendário; `start_time` e `end_time` definem o bloco de horário.

### Componentes a criar

| Arquivo | Descrição |
|---|---|
| `src/pages/dashboard/Schedule.tsx` | Página principal com toggle de modo e lógica de fetch |
| `src/components/dashboard/schedule/MonthView.tsx` | Grade mensal estilo Google Calendar |
| `src/components/dashboard/schedule/WeekView.tsx` | Grade semanal com eixo de horários |
| `src/components/dashboard/schedule/DayView.tsx` | Vista diária com linha do tempo |
| `src/components/dashboard/schedule/BookingDetailSheet.tsx` | Sheet lateral com detalhes do agendamento e ações |

### Painel Lateral (Sheet)

Ao clicar num agendamento em qualquer vista:
- Nome e e-mail do cliente
- Sessão, data, horário
- Status (badge) e pagamento
- Botões: Confirmar, Cancelar, Criar Galeria, Ver Briefing

### Sidebar

Adicionar item **"Schedule"** no grupo Photographers em `DashboardSidebar.tsx`, com ícone `CalendarDays`, rota `/dashboard/schedule`, **acima** de Bookings.

Adicionar rota em `App.tsx`.

### Status visual dos eventos

- **Pending** → borda/cor neutra (cinza)
- **Confirmed** → fundo escuro / destaque  
- **Cancelled** → riscado / opaco

### Sem mudanças no banco

Todos os dados necessários já existem nas tabelas `bookings`, `sessions` e `session_availability`. Nenhuma migration necessária.

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/dashboard/Schedule.tsx` | Criar (novo) |
| `src/components/dashboard/schedule/MonthView.tsx` | Criar (novo) |
| `src/components/dashboard/schedule/WeekView.tsx` | Criar (novo) |
| `src/components/dashboard/schedule/DayView.tsx` | Criar (novo) |
| `src/components/dashboard/schedule/BookingDetailSheet.tsx` | Criar (novo) |
| `src/components/dashboard/DashboardSidebar.tsx` | Adicionar item Schedule |
| `src/App.tsx` | Adicionar rota `/dashboard/schedule` |
