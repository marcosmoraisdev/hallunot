# Hallunot (Hallucination + Not)

> **Because AI hallucinations shouldn't break your build.**

**Hallunot** is a specialized tool designed for developers who leverage Large Language Models (LLMs) for coding. It helps you identify which library and framework versions an LLM is most likely to handle accurately, based on its training data cutoff dates.

## 🚀 The Problem
LLMs often hallucinate APIs, methods, or patterns for library versions released after their training data cutoff. This leads to broken builds, confusing error messages, and wasted debugging time as developers try to fix AI-generated code that references non-existent or deprecated features.

## ✨ The Solution
Hallunot provides a **heuristic compatibility score** (0-100) for library versions relative to specific LLMs. By analyzing the release date of a package against the approximate training cutoff of a model (like GPT-4o, Claude 3.5, or Gemini 2.0), Hallunot flags high-risk versions and recommends those the AI "knows" best.

---

## 🛠 Features

- **LLM-Specific Insights:** Select your model (GPT-4o, Claude Opus 4, etc.) to see tailored compatibility data.
- **Heuristic Quality Scoring:** Versions are color-coded (Green/Yellow/Red) based on risk levels.
- **Breaking Change Awareness:** Penalizes scores for versions containing major architectural shifts.
- **Clean, Dark-First UI:** Built with Radix UI and Tailwind CSS for a premium developer experience.
- **Zero-Trust Domain Logic:** Core scoring rules are pure TypeScript, decoupled from any framework.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/)) |
| **ORM** | [Prisma 7](https://www.prisma.io/) |
| **Testing** | [Vitest](https://vitest.dev/) |

---

## 📐 Architecture

The project follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles to ensure the logic is testable and maintainable:

- **Domain Layer:** Pure TypeScript entities and services (scoring logic). No dependencies on the database or framework.
- **Infrastructure Layer:** Data access via Prisma repositories and external API adapters.
- **Application Layer:** Next.js Route Handlers (API) and Server/Client Components (UI).

```text
src/
├── domain/         # Pure business logic & types
├── infrastructure/ # DB clients & repositories
├── components/     # Reusable Radix/Tailwind UI
└── app/            # Next.js 16 pages and API routes
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- PostgreSQL (or a Neon.tech connection string)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/hallunot.git
   cd hallunot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment:
   Copy `.env.example` to `.env` and provide your `DATABASE_URL`.

4. Database Setup:
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Run Development Server:
   ```bash
   npm run dev
   ```

---

## 📊 Scoring Heuristic (v1)

The compatibility score is calculated based on:
1. **Release Date <= Cutoff:** Base score 85-100 (higher for older, more established versions).
2. **Post-Cutoff Gap:** Scores decrease linearly for releases 0-6 months after the cutoff.
3. **Outdated Window:** Releases >6 months after the cutoff are marked as high risk (Score < 40).
4. **Breaking Changes:** A -15 penalty is applied if the version includes breaking changes relative to the LLM's "knowledge base".

---


## ⚠️ Disclaimer

**Hallunot provides educated heuristics, not official support indicators.** 
The scores are designed to reduce hallucinations when using LLMs *without* additional context (no RAG, no web search). Use these scores as a guide, not an absolute rule.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
