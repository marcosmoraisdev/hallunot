import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

function toUnixMs(dateStr: string): bigint {
  return BigInt(new Date(dateStr).getTime())
}

const llms = [
  { name: "GPT-4o", provider: "OpenAI", approxCutoff: toUnixMs("2024-10-01") },
  { name: "GPT-4 Turbo", provider: "OpenAI", approxCutoff: toUnixMs("2024-04-01") },
  { name: "Claude Opus 4", provider: "Anthropic", approxCutoff: toUnixMs("2025-03-01") },
  { name: "Claude Sonnet 4", provider: "Anthropic", approxCutoff: toUnixMs("2025-03-01") },
  { name: "Gemini 2.0 Flash", provider: "Google", approxCutoff: toUnixMs("2024-08-01") },
]

const libraries: {
  name: string
  ecosystem: string
  description: string
  versions: { version: string; releaseDate: string; breaking: boolean }[]
}[] = [
  {
    name: "react",
    ecosystem: "npm",
    description: "A JavaScript library for building user interfaces",
    versions: [
      { version: "18.2.0", releaseDate: "2022-06-14", breaking: false },
      { version: "18.3.0", releaseDate: "2024-04-25", breaking: false },
      { version: "18.3.1", releaseDate: "2024-04-26", breaking: false },
      { version: "19.0.0", releaseDate: "2024-12-05", breaking: true },
      { version: "19.1.0", releaseDate: "2025-04-01", breaking: false },
    ],
  },
  {
    name: "next",
    ecosystem: "npm",
    description: "The React framework for production",
    versions: [
      { version: "14.2.0", releaseDate: "2024-04-11", breaking: false },
      { version: "15.0.0", releaseDate: "2024-10-21", breaking: true },
      { version: "15.1.0", releaseDate: "2024-12-10", breaking: false },
      { version: "16.0.0", releaseDate: "2025-04-30", breaking: true },
      { version: "16.1.0", releaseDate: "2025-06-17", breaking: false },
    ],
  },
  {
    name: "typescript",
    ecosystem: "npm",
    description: "TypeScript is a language for application-scale JavaScript",
    versions: [
      { version: "5.3.0", releaseDate: "2023-11-20", breaking: false },
      { version: "5.4.0", releaseDate: "2024-03-06", breaking: false },
      { version: "5.5.0", releaseDate: "2024-06-20", breaking: false },
      { version: "5.6.0", releaseDate: "2024-09-09", breaking: false },
      { version: "5.7.0", releaseDate: "2024-11-22", breaking: false },
    ],
  },
  {
    name: "prisma",
    ecosystem: "npm",
    description: "Next-generation Node.js and TypeScript ORM",
    versions: [
      { version: "5.0.0", releaseDate: "2023-07-12", breaking: false },
      { version: "6.0.0", releaseDate: "2024-11-26", breaking: true },
      { version: "6.19.0", releaseDate: "2025-05-13", breaking: false },
      { version: "7.0.0", releaseDate: "2025-06-24", breaking: true },
    ],
  },
  {
    name: "tailwindcss",
    ecosystem: "npm",
    description: "A utility-first CSS framework",
    versions: [
      { version: "3.4.0", releaseDate: "2023-12-19", breaking: false },
      { version: "3.4.1", releaseDate: "2024-01-05", breaking: false },
      { version: "4.0.0", releaseDate: "2025-01-22", breaking: true },
    ],
  },
  {
    name: "express",
    ecosystem: "npm",
    description: "Fast, unopinionated, minimalist web framework for Node.js",
    versions: [
      { version: "4.18.0", releaseDate: "2022-04-25", breaking: false },
      { version: "4.19.0", releaseDate: "2024-03-20", breaking: false },
      { version: "5.0.0", releaseDate: "2024-10-01", breaking: true },
    ],
  },
  {
    name: "vue",
    ecosystem: "npm",
    description: "The progressive JavaScript framework",
    versions: [
      { version: "3.3.0", releaseDate: "2023-05-11", breaking: false },
      { version: "3.4.0", releaseDate: "2023-12-28", breaking: false },
      { version: "3.5.0", releaseDate: "2024-09-03", breaking: false },
    ],
  },
  {
    name: "angular",
    ecosystem: "npm",
    description: "Platform for building mobile and desktop web applications",
    versions: [
      { version: "17.0.0", releaseDate: "2023-11-08", breaking: true },
      { version: "18.0.0", releaseDate: "2024-05-22", breaking: true },
      { version: "19.0.0", releaseDate: "2024-11-19", breaking: true },
    ],
  },
  {
    name: "svelte",
    ecosystem: "npm",
    description: "Cybernetically enhanced web apps",
    versions: [
      { version: "4.0.0", releaseDate: "2023-06-22", breaking: false },
      { version: "5.0.0", releaseDate: "2024-10-22", breaking: true },
    ],
  },
  {
    name: "fastify",
    ecosystem: "npm",
    description: "Fast and low overhead web framework for Node.js",
    versions: [
      { version: "4.0.0", releaseDate: "2022-06-08", breaking: false },
      { version: "5.0.0", releaseDate: "2024-09-13", breaking: true },
    ],
  },
]

async function main() {
  console.log("Seeding database...")

  // Seed LLMs
  for (const llm of llms) {
    await prisma.llm.upsert({
      where: { name: llm.name },
      update: { provider: llm.provider, approxCutoff: llm.approxCutoff },
      create: { ...llm },
    })
  }

  console.log(`Seeded ${llms.length} LLMs`)

  // Seed Libraries and Versions
  for (const lib of libraries) {
    const library = await prisma.library.upsert({
      where: { name: lib.name },
      update: {
        ecosystem: lib.ecosystem,
        description: lib.description,
      },
      create: {
        name: lib.name,
        ecosystem: lib.ecosystem,
        description: lib.description,
      },
    })

    for (const ver of lib.versions) {
      await prisma.version.upsert({
        where: {
          libraryId_version: {
            libraryId: library.id,
            version: ver.version,
          },
        },
        update: {
          releaseDate: toUnixMs(ver.releaseDate),
          breaking: ver.breaking,
        },
        create: {
          libraryId: library.id,
          version: ver.version,
          releaseDate: toUnixMs(ver.releaseDate),
          breaking: ver.breaking,
        },
      })
    }

    console.log(`Seeded ${lib.name} with ${lib.versions.length} versions`)
  }

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
