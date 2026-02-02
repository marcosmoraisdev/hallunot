# How the Library Confidence Score Works

The **Library Confidence Score (LCS)** estimates how *reliable it is to expect good answers from LLMs when working with a given library*.

It does **not** try to guess whether a model was trained on that library or supports a specific version.  
Instead, it measures **risk**, based on public metadata and structural signals.

> In short:  
> **We don’t measure LLM knowledge. We measure the probability of failure.**

This approach scales to millions of libraries and avoids unverifiable claims.

---

## What This Score Represents

The Library Confidence Score answers one question:

> *“Given this library, how risky is it to rely on LLM-generated answers?”*

A higher score means:
- the library is stable and predictable
- its API changes infrequently
- it is simple, well-scoped, and publicly visible

A lower score means:
- higher volatility
- recent changes
- complex or poorly defined scope

The score ranges from **0 to 1** and is later combined with a **generic LLM reliability score** to produce a final, risk-adjusted result.

---

## What This Score Does NOT Claim

The score does **not** claim that:
- an LLM was trained on this library
- a specific version is supported
- answers will always be correct

Those claims cannot be verified from metadata and are intentionally avoided.

---

## Components of the Score

The Library Confidence Score is composed of five independent dimensions, all derived from public library metadata:

- API stability over time  
- Recency of changes  
- Conceptual simplicity  
- Public adoption and visibility  
- Language affinity

Each component is normalized to the range **[0, 1]**.

---

## The Formula

Library Confidence Score (LCS) =
- 0.30 × Stability Score
- 0.25 × Recency Risk Score
- 0.15 × Simplicity Score
- 0.20 × Popularity Score
- 0.10 × Language Affinity Score

Each term captures a different source of risk.

## Score Components Explained

### 1. Stability Score

Measures how volatile the library API is over its lifetime.

Libraries with few releases spread over many years tend to be:
- easier for LLMs to reason about
- less prone to hallucinated APIs
- more predictable overall

This score is derived from:
- the age of the library
- the number of released versions

---

### 2. Recency Risk Score

Penalizes recent changes.

If a library was updated very recently, the risk of outdated or incorrect LLM answers increases, regardless of model intelligence.

Libraries that have not changed for a long time receive a higher score.

---

### 3. Simplicity Score

Estimates the conceptual scope of the library.

Small, well-defined libraries (e.g. utilities) are easier for LLMs to handle than large, opinionated frameworks.

This score is inferred from:
- keywords
- declared scope indicators

---

### 4. Popularity Score

Uses adoption as a proxy for public exposure.

More popular libraries:
- have more examples in the open
- appear more frequently in issues, tutorials, and discussions
- are statistically more likely to be represented in training data

Popularity is normalized using logarithmic scaling to avoid bias toward extremely large projects.

---

### 5. Language Affinity Score

Models the general strength of LLMs in the library’s primary programming language.

This is a fixed, configurable mapping based on long-term ecosystem maturity (e.g. JavaScript and Python score higher than niche languages).

---

## Combining Library and LLM Scores

The Library Confidence Score is combined with a **Generic LLM Score**, which measures model behavior such as:
- hallucination rate
- consistency
- ability to ask for missing context

Final Confidence Score = LLM Generic Score × Library Confidence Score


This produces a **risk-adjusted score** that reflects both:
- how reliable the model is in general
- how risky the chosen library is

---

## How to Interpret the Result

A higher score means:
- lower expected error rate
- higher predictability
- safer use of LLM-generated answers

A lower score means:
- higher risk of incorrect assumptions
- greater need for human validation

---

## Core Principle

> **Metadata cannot measure knowledge.  
> Metadata can measure risk.**

This scoring model is intentionally conservative, transparent, and scalable — designed to inform decisions, not to oversell capabilities.
