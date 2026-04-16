

## Problema: Header verde no preview

O header do site está mostrando um fundo verde (#80ff80) porque esse valor está salvo na coluna `header_bg_color` da tabela `photographer_site` no banco de dados. Mesmo com todas as páginas deletadas, o `PublicSiteRenderer` ainda lê essa configuração global e aplica no `SharedNav`.

## Solução

Duas ações:

### 1. Limpar o valor no banco
Executar uma migration para resetar o `header_bg_color` do seu fotógrafo:
```sql
UPDATE photographer_site 
SET header_bg_color = NULL 
WHERE header_bg_color = '#80ff80';
```

### 2. Adicionar reset de cores no editor
No painel de configurações do site (WebsiteSettings ou HeaderSliderPanel), garantir que exista uma opção de "resetar cor" para o header — um botão que seta `header_bg_color` de volta para `NULL` (transparente/auto).

Isso é simples e rápido — o verde é apenas um valor salvo que precisa ser limpo.

