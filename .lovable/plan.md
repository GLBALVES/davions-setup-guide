

## Renomear templates de site para nomes de flores

### Mapeamento

| ID interno (não muda) | Nome atual | Novo nome |
|------------------------|-----------|-----------|
| editorial | Editorial | Rosa |
| grid | Grid | Lírio |
| magazine | Magazine | Orquídea |
| clean | Clean | Jasmim |
| sierra | Sierra | Lavanda |
| canvas | Canvas | Dália |
| avery | Avery | Camélia |
| seville | Seville | Magnólia |
| milo | Milo | Violeta |

### Arquivos a editar

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/dashboard/WebsiteSettings.tsx` | Labels dos 9 templates |
| `src/pages/dashboard/WebsiteEditor.tsx` | Labels dos 4 templates listados |
| `src/pages/dashboard/Personalize.tsx` | Labels dos 4 templates listados |

Os `value` internos (`editorial`, `grid`, etc.) permanecem iguais — só o texto exibido ao usuário muda.

