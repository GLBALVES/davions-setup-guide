

## Plano: Melhorar Push Status Card e Preferências de Notificação

### Problema
1. Quando push está **bloqueado** (denied), o card não mostra nenhum botão — o usuário fica sem ação.
2. Não há instrução clara de como desbloquear no navegador.
3. As preferências (toggles) parecem não ter feedback visual ao interagir.

### Alterações

**1. `src/pages/dashboard/Settings.tsx` — NotificationPushStatusCard**
- Quando `denied`: mostrar um botão "Como desbloquear" que abre instruções (ex: "Vá em Configurações do site → Permissões → Notificações → Permitir") com link/guia visual.
- Quando `default`: manter botão "Ativar Push" (já existe).
- Quando `granted`: manter botão "Enviar Teste" (já existe) + adicionar indicador visual verde.
- Adicionar um botão "Verificar novamente" no estado `denied` que re-checa `Notification.permission` (caso o usuário desbloqueie manualmente no navegador e volte à página).

**2. `src/lib/i18n/translations.ts`**
- Adicionar traduções para: `pushHowToUnblock`, `pushUnblockInstructions`, `pushRecheckPermission` em EN/PT/ES.

### Detalhes técnicos

```text
Push Status Card states:

┌─────────────────────────────────────────────┐
│ 🔔 Push Status                              │
│ ✅ Enabled  |  ⚠️ Pending  |  🚫 Blocked    │
│                                             │
│ [Enable Push]  or  [Send Test]  or          │
│ [How to Unblock] [Check Again]              │
└─────────────────────────────────────────────┘
```

No estado `denied`, o card mostrará:
- Texto explicativo de como desbloquear (Chrome/Firefox/Safari)
- Botão "Verificar novamente" que executa `setPushPermission(Notification.permission)` para atualizar o estado sem recarregar a página

