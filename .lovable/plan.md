
## What needs to change

All Portuguese text across the Sessions feature must be replaced with English (US). The currency must also be changed from BRL (R$) to USD ($). Here's every string that needs fixing:

### `src/pages/dashboard/SessionForm.tsx`
- Line 29: `DAY_LABELS` — "Dom", "Seg", etc. → "Sun", "Mon", etc.
- Line 30: `DAY_FULL` — "Domingo", "Segunda-feira", etc. → "Sunday", "Monday", etc.
- Line 149: toast `"Upload falhou"` → `"Upload failed"`
- Line 164: toast `"Título obrigatório"` → `"Title is required"`
- Line 191/201: toast errors → English
- Line 223: toast `"Sessão atualizada"` / `"Sessão criada"` → `"Session updated"` / `"Session created"`
- Line 306: `"Voltar para Sessions"` → `"Back to Sessions"`
- Line 310/313: `"Editar Session"` / `"Nova Session"` / `"Criar Session"` / `"Sem título"` → English
- Line 319: `"Foto de Capa"` → `"Cover Photo"`
- Line 340: `"Clique para enviar"` → `"Click to upload"`
- Line 360: `"Detalhes da Session"` → `"Session Details"`
- Line 365: `"Título *"` → `"Title *"`
- Line 372: placeholder `"ex: Ensaio New Born"` → `"e.g. Newborn Session"`
- Line 377: `"Descrição"` → `"Description"`
- Line 383: placeholder → English
- Line 391: `"Preço (R$)"` → `"Price (USD)"`
- Line 405: `"Local"` → `"Location"`
- Line 414: placeholder `"ex: São Paulo, SP"` → `"e.g. New York, NY"`
- Line 419: `"Duração (min)"` → `"Duration (min)"`
- Line 432: `"Intervalo (min)"` → `"Break (min)"`
- Line 445: `"Nº de Fotos"` → `"No. of Photos"`
- Line 462: duration summary text → English
- Line 468: `"Ativo na Loja"` → `"Active in Store"`
- Line 470: description → English
- Line 485: `"Horários por Dia da Semana"` → `"Weekly Availability"`
- Line 488: description → English
- Line 515/519: `"{n} horário(s)"` / `"Sem horários"` → English
- Line 564: `"Novo"` badge → `"New"`
- Line 594: `"(livre ...)"` → `"(free ...)"` 
- Line 603: `"Confirmar"` → `"Confirm"`
- Line 617/619: empty state → English
- Line 637: `"Cancelar"` → `"Cancel"`
- Line 645: `"Salvar Alterações"` / `"Criar Session"` → `"Save Changes"` / `"Create Session"`

### `src/pages/dashboard/Sessions.tsx`
- Line 129: `"pt-BR"` / `"BRL"` → `"en-US"` / `"USD"`
- Line 176: `"{n} fotos"` → `"{n} photos"`

### `src/pages/store/StorePage.tsx`
- Line 108–111: `"pt-BR"` / `"BRL"` → `"en-US"` / `"USD"`
- Line 148: `"{n} fotos"` → `"{n} photos"`

### `src/pages/store/SessionDetailPage.tsx`
- Line 18: remove `ptBR` locale import
- Line 92: date label format → English (remove `{ locale: ptBR }`)
- Line 253: `"Sessão não encontrada."` → `"Session not found."`
- Line 255: `"Voltar para a loja"` → `"Back to the store"`
- Line 261–264: `"pt-BR"` / `"BRL"` → `"en-US"` / `"USD"`
- Line 283/284: `"Agendar Session"` → `"Book a Session"`
- Line 309: `"minutos"` → `"minutes"`
- Line 313: `"fotos"` → `"photos"`
- Line 332: `"Escolha uma data e horário"` → `"Choose a date & time"`
- Line 335: `"Nenhum horário disponível no momento."` → `"No available slots at this time."`
- Line 384: `"Horário selecionado"` → `"Selected slot"`
- Line 392: `"Seus dados"` → `"Your details"`
- Line 396/407: labels → English
- Line 403/415: placeholders → English
- Line 432: `"Voltar"` → `"Back"`
- Line 445: `"Pagar {price}"` → `"Pay {price}"`
- Lines with `"Erro ao criar reserva"`, `"Erro no pagamento"`, etc. → English error messages

### Implementation
All changes are pure string/locale swaps in 4 files. No structural or logic changes needed.
