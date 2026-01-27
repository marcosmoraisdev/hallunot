export interface Library {
  id: string
  name: string
  ecosystem: string
  description?: string
}

export interface Version {
  id: string
  libraryId: string
  version: string
  releaseDate: number // Unix ms
  breaking: boolean
}
