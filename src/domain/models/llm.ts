export interface Llm {
  id: string
  name: string
  provider: string
  approxCutoff: number // Unix ms
}
