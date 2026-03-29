

## Adicionar me@palomaschell.com como Admin

### Dados
- **Email**: me@palomaschell.com
- **User ID**: `b57d5abc-dae9-4f08-bfa5-dc45c8eb3967`

### Ação
Inserir registro na tabela `user_roles`:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('b57d5abc-dae9-4f08-bfa5-dc45c8eb3967', 'admin');
```

Após isso, o usuário terá acesso completo ao Admin Panel.

