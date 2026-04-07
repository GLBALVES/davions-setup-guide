

## Separar "Itens Inclusos" do "Endereço" na página de sessão pública

### O que será feito
Na seção "What's included" da `SessionDetailPage.tsx`, o endereço (location) aparece misturado com os itens inclusos (duração, fotos, bônus). Vamos separar o endereço em sua própria seção abaixo dos itens inclusos.

### Alteração

**Arquivo:** `src/pages/store/SessionDetailPage.tsx` (linhas ~936-961)

Mover o bloco `session.location` para fora da seção "What's included", criando uma seção separada "Location" logo abaixo:

```
What's included
  ✓ 60 minutes session
  ✓ 20 edited photos delivered
  ✓ [bônus items...]

Location
  📍 Endereço aqui
```

- A seção "Location" terá o mesmo estilo visual (label uppercase tracking-wide + ícone MapPin)
- Só aparece se `session.location` existir

