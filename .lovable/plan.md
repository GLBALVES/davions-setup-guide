

## Adicionar botão "Esconder" ao carregar carrossel do histórico

### Problema
Quando o usuário carrega um carrossel do histórico, ele fica visível na tela sem opção de escondê-lo. O usuário quer poder ocultar o preview carregado.

### Solução

**Editar `src/pages/dashboard/creative/CarrosselPage.tsx`:**
- Na seção `{carrossel && !isEditing && (...)}` (linha ~239), adicionar um botão "Esconder" (com ícone `EyeOff`) que limpa o estado do carrossel (`setCarrossel(null)`)
- Posicionar o botão no topo da seção de preview, ao lado dos controles existentes

O botão simplesmente executa `setCarrossel(null)` para ocultar o preview, sem deletar nada do histórico.

### Arquivo

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/dashboard/creative/CarrosselPage.tsx` — adicionar botão Esconder na view de carregamento |

