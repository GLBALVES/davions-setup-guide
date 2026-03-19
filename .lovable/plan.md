
## Problema

O `AdminLayout` foi corrigido com um timeout de 5s que redireciona para `/dashboard` se a query de `user_roles` demorar. Mas o próprio timeout é o que está causando o redirecionamento — a query pode estar demorando mais de 5s na primeira carga, ou o estado `loading` do `AuthContext` ainda não terminou quando o timer dispara.

Além disso, o `checking` começa como `true` mas o effect tem `if (loading) return` — quando `loading` é `true` no mount, o effect não inicia a query. Quando `loading` muda para `false` e o effect re-executa, o timer de 5s começa. Se a resolução do `AuthContext` + query `user_roles` ultrapassar 5s total, o timer redireciona.

## Causa confirmada

Verificado no banco: o usuário `gilberto@giombelli.com.br` **tem** o role `admin` na tabela `user_roles`. A policy RLS `Users can read own roles (user_id = auth.uid())` permite o SELECT. A query **deveria** retornar `data` corretamente.

O timeout de 5s é agressivo demais — está abortando antes da query completar.

## Fix

**`src/components/admin/AdminLayout.tsx`** — remover o timeout por completo. A lógica correta é:

1. Aguardar `loading` do AuthContext terminar
2. Se sem usuário → redirecionar para `/login`
3. Executar a query `user_roles` sem timeout
4. Se a query retornar `data` → `setChecking(false)` e renderizar
5. Se retornar `null` ou erro → redirecionar para `/dashboard`

O spinner continua visível enquanto verifica — sem limite de tempo artificial.

```typescript
export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }

    const run = async () => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!data) { navigate("/dashboard"); return; }
        setChecking(false);
      } catch {
        navigate("/dashboard");
      }
    };

    run();
  }, [user, loading, navigate]);

  // ...
}
```

## Arquivo alterado
- `src/components/admin/AdminLayout.tsx` — remover o `setTimeout` / `checkTimer` completamente
