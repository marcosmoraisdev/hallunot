# Hallunot


**Hallunot** is a tool that helps developers pick library and framework versions that a given LLM is more likely to know well — reducing hallucinations when coding with AI without extra context (no RAG, no web search, no MCP).

## 🚀 The Problem
LLMs hallucinate APIs, methods, and patterns — especially for library versions they weren't trained on. But the problem goes deeper than training cutoff dates alone. A model's coding ability, context limits, training openness, and a library's own stability and complexity all affect how reliably an LLM can work with a given version.

## ✨ The Solution
Hallunot combines **library-level** and **model-level** signals into a single heuristic score for every library + version + LLM combination: `Final = LCS x LGS`.

### Library Confidence Score (LCS)
How well-suited is this version for AI-assisted coding?
- **Stability** — Fewer breaking changes and a mature release history signal reliability.
- **Simplicity** — Simpler APIs are easier for any model to get right.
- **Popularity** — Widely used libraries appear more often in training data.
- **Language Affinity** — How well the library's language/ecosystem is represented in training corpora.
- **Recency Risk** — Versions released near or after the model's knowledge cutoff carry more risk.

### LLM Generic Score (LGS)
How capable is this model at coding tasks in general?
- **Capability** — Breadth of model features (reasoning, tool calling, structured output, multimodal I/O, etc.).
- **Context Limits** — Larger context windows help with complex codebases.
- **Recency** — More recently trained models have broader library coverage.
- **Openness** — Open-weight models with known training data get a bonus.

The final score is color-coded as green (low risk), yellow (medium), or red (high risk).

---


## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 16](https://nextjs.org/)  |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Data Sources** | [Libraries.io API](https://libraries.io/) + [models.dev](https://models.dev/)  |
| **Testing** | [Vitest](https://vitest.dev/) |

---

## 📐 Architecture

The project follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles to ensure the logic is testable and maintainable:

- **Domain Layer:** Pure TypeScript entities and services (scoring logic). No dependencies on the database or framework.
- **Infrastructure Layer:** External API adapters (Libraries.io) and data mappers.
- **Application Layer:** Next.js Route Handlers (API) and Server/Client Components (UI).

```text
src/
├── domain/         # Pure business logic & types
├── infrastructure/ # API adapters & data mappers
├── components/     # Reusable Radix/Tailwind UI
└── app/            # Next.js 16 pages and API routes
```

---

## 🚦 Getting Started

### Prerequisites
- Node.js 22+

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/marcosmoraisDev/hallunot.git
   cd hallunot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment:
   Copy `.env.example` to `.env` and provide your `LIBRARIES_IO_API_KEY` ([get one here](https://libraries.io/account)).

4. Run Development Server:
   ```bash
   npm run dev
   ```


## ⚠️ Disclaimer

**Hallunot provides educated heuristics, not official support indicators.** 
The scores are designed to reduce hallucinations when using LLMs *without* additional context (no Context MCPs, no web search). Use these scores as a guide, not an absolute rule.

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, PR guidelines, and coding standards.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
