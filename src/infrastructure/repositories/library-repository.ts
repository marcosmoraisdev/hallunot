import prisma from "../db/prisma"
import type { Library, Version } from "../../domain/models"

export interface LibraryWithVersions extends Library {
  versions: Version[]
}

export async function findLibraries(
  page: number,
  limit: number,
  search?: string
): Promise<{ data: LibraryWithVersions[]; total: number }> {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { ecosystem: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined

  const [libraries, total] = await Promise.all([
    prisma.library.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { versions: { orderBy: { releaseDate: "desc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.library.count({ where }),
  ])

  const data = libraries.map((lib) => ({
    id: lib.id,
    name: lib.name,
    ecosystem: lib.ecosystem,
    description: lib.description ?? undefined,
    versions: lib.versions.map((v) => ({
      id: v.id,
      libraryId: v.libraryId,
      version: v.version,
      releaseDate: Number(v.releaseDate),
      breaking: v.breaking,
    })),
  }))

  return { data, total }
}

export async function findLibraryById(
  id: string
): Promise<LibraryWithVersions | null> {
  const lib = await prisma.library.findUnique({
    where: { id },
    include: { versions: { orderBy: { releaseDate: "desc" } } },
  })

  if (!lib) return null

  return {
    id: lib.id,
    name: lib.name,
    ecosystem: lib.ecosystem,
    description: lib.description ?? undefined,
    versions: lib.versions.map((v) => ({
      id: v.id,
      libraryId: v.libraryId,
      version: v.version,
      releaseDate: Number(v.releaseDate),
      breaking: v.breaking,
    })),
  }
}
