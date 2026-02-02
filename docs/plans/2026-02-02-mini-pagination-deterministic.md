# MiniPagination com Modo Determinístico

## Contexto

O componente `MiniPagination` atual usa apenas heurística (`hasMore`) para determinar se há mais páginas. Isso não permite mostrar o total de páginas ao usuário.

## Objetivo

Adicionar suporte a modo determinístico que mostra "1 / 5" (página atual / total), mantendo retrocompatibilidade com o modo heurístico existente.

## Design

### API do componente

```typescript
interface MiniPaginationProps {
  page: number              // 1-indexed (primeira página = 1)
  hasMore: boolean          // usado no modo heurístico
  onPageChange: (page: number) => void
  totalPages?: number       // se presente, ativa modo determinístico
}
```

### Comportamento

| Aspecto | Modo Heurístico | Modo Determinístico |
|---------|-----------------|---------------------|
| Ativação | `totalPages` ausente | `totalPages` presente |
| Visual | "Page 1" | "1 / 5" |
| Ocultar | `page === 1 && !hasMore` | `totalPages <= 1` |
| Botão anterior | desabilitado se `page === 1` | desabilitado se `page === 1` |
| Botão próximo | desabilitado se `!hasMore` | desabilitado se `page >= totalPages` |

### Mudanças no Backend

**`llm-service.ts`:**
- `PaginationParams.page` passa a ser 1-indexed
- `PaginationMeta` ganha campo `totalPages` calculado
- Cálculo: `totalPages = Math.ceil(total / perPage)`
- Slice ajustado: `startIndex = (page - 1) * perPage`

**`route.ts`:**
- `DEFAULT_PAGE` muda de `0` para `1`

### Mudanças no LlmGridSelector

- Estado `page` inicia em `1`
- Novo estado `totalPages` extraído da resposta da API
- Passa `totalPages` para `MiniPagination`
- Reset de página usa `1` ao invés de `0`

## Arquivos Afetados

1. `src/components/mini-pagination.tsx` - adicionar prop e lógica
2. `src/domain/services/llm-service.ts` - 1-indexed e totalPages
3. `src/domain/models/llm-response.ts` - adicionar totalPages ao tipo
4. `src/app/api/llms/route.ts` - DEFAULT_PAGE = 1
5. `src/components/llm-grid-selector.tsx` - consumir totalPages
