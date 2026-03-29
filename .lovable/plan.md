

## Adicionar internacionalanglo@gmail.com como Admin

### Dados encontrados
- **Email**: internacionalanglo@gmail.com
- **User ID**: `f26bc620-715a-4f6e-9386-94365164e444`
- **Status atual**: Não é admin (sem registro em `user_roles`)

### Ação
Inserir um registro na tabela `user_roles` com role `admin` para este usuário.

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('f26bc620-715a-4f6e-9386-94365164e444', 'admin');
```

### Alternativa imediata
Se você já tem acesso ao painel admin, basta ir em **Admin Panel → Studios**, localizar `internacionalanglo@gmail.com` e clicar no botão **"User"** para alternar para **"Admin"**.

