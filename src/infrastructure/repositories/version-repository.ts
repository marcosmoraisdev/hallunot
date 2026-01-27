import prisma from "../db/prisma"
import type { Version } from "../../domain/models"

export async function findVersionsByLibraryId(
  libraryId: string,
  page: number,
  limit: number
): Promise<{ data: Version[]; total: number }> {
  const [versions, total] = await Promise.all([
    prisma.version.findMany({
      where: { libraryId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { releaseDate: "desc" },
    }),
    prisma.version.count({ where: { libraryId } }),
  ])

  const data = versions.map((v) => ({
    id: v.id,
    libraryId: v.libraryId,
    version: v.version,
    releaseDate: Number(v.releaseDate),
    breaking: v.breaking,
  }))

  return { data, total }
}
