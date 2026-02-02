# Design: Migration to models.dev API

## Overview

Replace static LLM data with dynamic data from the models.dev API. This removes the need for a local database and provides access to hundreds of LLM models with up-to-date metadata.

### Goals

- Remove static `src/data/llms.json` and related code
- Fetch LLM data from `https://models.dev/api.json`
- Cache responses using Next.js ISR (1 day)
- Expose filtered, paginated LLM data to the frontend
- Maintain clean architecture separation

### Non-Goals

- LLM Generic Score implementation (deferred to v2)
- Revalidation endpoint (simplified to time-based cache only)
- Database integration (removed from scope)

---

## Data Flow

```
models.dev/api.json
        │
        ▼
   Next.js fetch (ISR 86400s / 1 day)
        │
        ▼
   ModelsDevResponseDTO (infrastructure/types)
        │
        ▼
   models-dev-mapper.ts (infrastructure/mappers)
        │
        ▼
   LlmProvider[] / LlmModel[] (domain/models)
        │
        ▼
   llm-service.ts (domain/services)
        │
        ▼
   LlmListResponse (domain/models)
        │
        ▼
   /api/llms (app/api)
        │
        ▼
   Frontend
```

---

## Type System

Three-layer type transformation:

| Layer | Suffix | Purpose |
|-------|--------|---------|
| Infrastructure | `*DTO` | Raw API response types |
| Domain | (none) | Internal business entities |
| Response | `*Response` | Frontend-facing types (minimal) |

### Infrastructure Types

**File:** `src/infrastructure/types/models-dev.ts`

```ts
export interface ModelsDevResponseDTO {
  [providerId: string]: ModelsDevProviderDTO
}

export interface ModelsDevProviderDTO {
  id: string
  name: string
  env: string[]
  npm: string
  api: string
  doc: string
  models: { [modelId: string]: ModelsDevModelDTO }
}

export interface ModelsDevModelDTO {
  id: string
  name: string
  family: string
  release_date?: string
  last_updated?: string
  knowledge?: string           // "YYYY-MM" format - the cutoff date
  reasoning?: boolean
  tool_call?: boolean
  attachment?: boolean
  structured_output?: boolean
  temperature?: boolean
  modalities?: {
    input: string[]
    output: string[]
  }
  limit?: {
    context?: number
    output?: number
  }
  cost?: {
    input?: number
    output?: number
    reasoning?: number
    cache_read?: number
    cache_write?: number
  }
}
```

### Domain Types

**File:** `src/domain/models/llm.ts`

```ts
export interface LlmProvider {
  id: string
  name: string
  env: string[]
  npm: string
  api: string
  doc: string
  models: LlmModel[]
}

export interface LlmModel {
  id: string
  providerId: string
  name: string
  family: string
  releaseDate?: string
  lastUpdated?: string
  knowledgeCutoff?: string     // "YYYY-MM" format
  reasoning?: boolean
  toolCall?: boolean
  attachment?: boolean
  structuredOutput?: boolean
  temperature?: boolean
  modalities?: {
    input: string[]
    output: string[]
  }
  limit?: {
    context?: number
    output?: number
  }
  cost?: {
    input?: number
    output?: number
    reasoning?: number
    cacheRead?: number
    cacheWrite?: number
  }
}
```

### Response Types

**File:** `src/domain/models/llm-response.ts`

```ts
export interface LlmProviderResponse {
  id: string
  name: string
  doc: string
  modelCount: number
}

export interface LlmModelResponse {
  id: string
  providerId: string
  providerName: string
  name: string
  family: string
  knowledgeCutoff?: string
  reasoning?: boolean
  toolCall?: boolean
  modalities?: {
    input: string[]
    output: string[]
  }
  limit?: {
    context?: number
    output?: number
  }
}

export interface LlmListResponse {
  providers: LlmProviderResponse[]
  models: LlmModelResponse[]
  pagination: {
    page: number
    perPage: number
    total: number
  }
}
```

---

## Infrastructure Layer

### Adapter

**File:** `src/infrastructure/adapters/models-dev.ts`

Responsibilities:
- Fetch data from models.dev API
- Apply Next.js ISR caching (1 day)
- Delegate transformation to mapper

```ts
import { ModelsDevResponseDTO } from '../types/models-dev'
import { LlmProvider } from '@/domain/models/llm'
import { mapModelsDevResponse } from '../mappers/models-dev-mapper'

const MODELS_DEV_URL = 'https://models.dev/api.json'
const CACHE_DURATION = 86400 // 1 day

export async function fetchAllProviders(): Promise<LlmProvider[]> {
  const res = await fetch(MODELS_DEV_URL, {
    next: { revalidate: CACHE_DURATION },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch models.dev: ${res.status}`)
  }

  const data: ModelsDevResponseDTO = await res.json()
  return mapModelsDevResponse(data)
}
```

### Mapper

**File:** `src/infrastructure/mappers/models-dev-mapper.ts`

Responsibilities:
- Transform DTO to domain types
- Convert snake_case to camelCase
- Convert object maps to arrays
- Inject providerId into models

```ts
import {
  ModelsDevResponseDTO,
  ModelsDevProviderDTO,
  ModelsDevModelDTO,
} from '../types/models-dev'
import { LlmProvider, LlmModel } from '@/domain/models/llm'

export function mapModelsDevResponse(data: ModelsDevResponseDTO): LlmProvider[] {
  return Object.entries(data).map(([providerId, provider]) =>
    mapProvider(providerId, provider)
  )
}

function mapProvider(
  providerId: string,
  dto: ModelsDevProviderDTO
): LlmProvider {
  const models = Object.entries(dto.models).map(([modelId, model]) =>
    mapModel(providerId, modelId, model)
  )

  return {
    id: dto.id || providerId,
    name: dto.name,
    env: dto.env,
    npm: dto.npm,
    api: dto.api,
    doc: dto.doc,
    models,
  }
}

function mapModel(
  providerId: string,
  modelId: string,
  dto: ModelsDevModelDTO
): LlmModel {
  return {
    id: dto.id || modelId,
    providerId,
    name: dto.name,
    family: dto.family,
    releaseDate: dto.release_date,
    lastUpdated: dto.last_updated,
    knowledgeCutoff: dto.knowledge,
    reasoning: dto.reasoning,
    toolCall: dto.tool_call,
    attachment: dto.attachment,
    structuredOutput: dto.structured_output,
    temperature: dto.temperature,
    modalities: dto.modalities,
    limit: dto.limit,
    cost: dto.cost
      ? {
          input: dto.cost.input,
          output: dto.cost.output,
          reasoning: dto.cost.reasoning,
          cacheRead: dto.cost.cache_read,
          cacheWrite: dto.cost.cache_write,
        }
      : undefined,
  }
}
```

---

## Domain Layer

### LLM Service

**File:** `src/domain/services/llm-service.ts`

Responsibilities:
- Filter providers by ID
- Search models by name/family/provider
- Paginate results
- Transform domain types to response types

```ts
import { LlmProvider, LlmModel } from '@/domain/models/llm'
import {
  LlmProviderResponse,
  LlmModelResponse,
  LlmListResponse,
} from '@/domain/models/llm-response'

export interface LlmFilters {
  provider?: string
  search?: string
}

export interface PaginationParams {
  page: number
  perPage: number
}

export function filterAndPaginateLlms(
  providers: LlmProvider[],
  filters: LlmFilters,
  pagination: PaginationParams
): LlmListResponse {
  // Filter providers
  let filteredProviders = providers
  if (filters.provider) {
    filteredProviders = providers.filter(
      (p) => p.id.toLowerCase() === filters.provider!.toLowerCase()
    )
  }

  // Extract models with providerName
  let models = filteredProviders.flatMap((p) =>
    p.models.map((m) => ({ ...m, providerName: p.name }))
  )

  // Filter by search
  if (filters.search) {
    const search = filters.search.toLowerCase()
    models = models.filter(
      (m) =>
        m.name.toLowerCase().includes(search) ||
        m.family.toLowerCase().includes(search) ||
        m.providerId.toLowerCase().includes(search)
    )
  }

  // Paginate
  const total = models.length
  const { page, perPage } = pagination
  const paginatedModels = models.slice(page * perPage, (page + 1) * perPage)

  return {
    providers: mapProvidersToResponse(providers),
    models: mapModelsToResponse(paginatedModels),
    pagination: { page, perPage, total },
  }
}

export function findModelById(
  providers: LlmProvider[],
  modelId: string
): LlmModel | undefined {
  for (const provider of providers) {
    const model = provider.models.find((m) => m.id === modelId)
    if (model) return model
  }
  return undefined
}

function mapProvidersToResponse(providers: LlmProvider[]): LlmProviderResponse[] {
  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    doc: p.doc,
    modelCount: p.models.length,
  }))
}

function mapModelsToResponse(
  models: (LlmModel & { providerName: string })[]
): LlmModelResponse[] {
  return models.map((m) => ({
    id: m.id,
    providerId: m.providerId,
    providerName: m.providerName,
    name: m.name,
    family: m.family,
    knowledgeCutoff: m.knowledgeCutoff,
    reasoning: m.reasoning,
    toolCall: m.toolCall,
    modalities: m.modalities,
    limit: m.limit,
  }))
}
```

---

## API Layer

### GET /api/llms

**File:** `src/app/api/llms/route.ts`

Responsibilities:
- Parse query parameters
- Orchestrate adapter and service calls
- Return HTTP response

```ts
import { NextRequest, NextResponse } from 'next/server'
import { fetchAllProviders } from '@/infrastructure/adapters/models-dev'
import { filterAndPaginateLlms } from '@/domain/services/llm-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const filters = {
    provider: searchParams.get('provider') || undefined,
    search: searchParams.get('q') || undefined,
  }

  const pagination = {
    page: Math.max(0, parseInt(searchParams.get('page') || '0', 10)),
    perPage: Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20', 10))),
  }

  try {
    const providers = await fetchAllProviders()
    const response = filterAndPaginateLlms(providers, filters, pagination)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch LLMs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LLMs' },
      { status: 500 }
    )
  }
}
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | - | Filter by provider ID |
| `q` | string | - | Search by name/family/provider |
| `page` | number | 0 | Page number (0-indexed) |
| `per_page` | number | 20 | Items per page (max 100) |

**Example Response:**

```json
{
  "providers": [
    { "id": "openai", "name": "OpenAI", "doc": "https://...", "modelCount": 15 }
  ],
  "models": [
    {
      "id": "gpt-4o",
      "providerId": "openai",
      "providerName": "OpenAI",
      "name": "GPT-4o",
      "family": "gpt-4",
      "knowledgeCutoff": "2024-04",
      "reasoning": false,
      "toolCall": true,
      "modalities": { "input": ["text", "image"], "output": ["text"] },
      "limit": { "context": 128000, "output": 4096 }
    }
  ],
  "pagination": { "page": 0, "perPage": 20, "total": 150 }
}
```

---

## Files to Change

### New Files

| File | Description |
|------|-------------|
| `src/infrastructure/types/models-dev.ts` | DTO types for models.dev API |
| `src/infrastructure/adapters/models-dev.ts` | Fetch adapter with caching |
| `src/infrastructure/mappers/models-dev-mapper.ts` | DTO to domain transformation |
| `src/domain/models/llm-response.ts` | Frontend response types |
| `src/domain/services/llm-service.ts` | Filtering, pagination, response mapping |

### Modified Files

| File | Changes |
|------|---------|
| `src/domain/models/llm.ts` | Replace with new domain types |
| `src/app/api/llms/route.ts` | Rewrite to use new adapter and service |
| `src/app/api/score/route.ts` | Update imports to use new adapter |

### Deleted Files

| File | Reason |
|------|--------|
| `src/data/llms.json` | Static data replaced by API |
| `src/data/llms.ts` | Functions replaced by service |

---

## Final Directory Structure

```
src/
├── app/
│   └── api/
│       ├── llms/route.ts         [REWRITE]
│       ├── score/route.ts        [UPDATE]
│       ├── search/route.ts       (unchanged)
│       └── platforms/route.ts    (unchanged)
├── domain/
│   ├── models/
│   │   ├── llm.ts                [UPDATE]
│   │   ├── llm-response.ts       [NEW]
│   │   └── ...
│   └── services/
│       ├── llm-service.ts        [NEW]
│       ├── scoring.ts            (unchanged)
│       └── ...
├── infrastructure/
│   ├── adapters/
│   │   ├── libraries-io.ts       (unchanged)
│   │   └── models-dev.ts         [NEW]
│   ├── mappers/
│   │   └── models-dev-mapper.ts  [NEW]
│   └── types/
│       └── models-dev.ts         [NEW]
├── data/
│   ├── llms.json                 [DELETE]
│   └── llms.ts                   [DELETE]
└── lib/
    └── ...                       (unchanged)
```

---

## Implementation Order

1. Create infrastructure types (`models-dev.ts`)
2. Create mapper (`models-dev-mapper.ts`)
3. Create adapter (`models-dev.ts`)
4. Update domain types (`llm.ts`)
5. Create response types (`llm-response.ts`)
6. Create LLM service (`llm-service.ts`)
7. Rewrite `/api/llms` route
8. Update `/api/score` route imports
9. Delete old data files
10. Test all endpoints
