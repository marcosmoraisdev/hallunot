# How the LLM Generic Score (LGS) Works

The **LLM Generic Score (LGS)** estimates how *capable and reliable an LLM is in general*, based purely on **declared technical metadata**.

It does **not** measure real-world answer quality, task-specific performance, or benchmark results.  
Instead, it evaluates **potential capability and operational maturity**, using standardized signals exposed by model providers and aggregators such as **models.dev**.

> In short:  
> **We don’t measure how smart a model is. We measure what it is technically capable of doing.**

This approach is fully **stateless**, transparent, and scalable across hundreds or thousands of models.

---

## What This Score Represents

The LLM Generic Score answers one question:

> *“Given only public metadata, how capable and complete is this model?”*

A higher score means:
- broader declared capabilities
- modern architectural features
- larger operational limits
- more recent and actively maintained models

A lower score means:
- narrow or specialized scope
- missing advanced features
- smaller limits or outdated knowledge

The score ranges from **0 to 1** and is later combined with the **Library Confidence Score (LCS)** to produce a final, risk-adjusted result.

---

## What This Score Does NOT Claim

The LGS does **not** claim that:
- the model produces better answers than others
- benchmark performance is superior
- the model is suitable for a specific task or domain
- the model has seen any particular data during training

Those claims require benchmarks or private evaluations and are intentionally excluded.

---

## Core Design Principle

> **Metadata does not measure intelligence.  
> Metadata measures declared capability.**

The LGS treats model metadata as a *capability surface*, not as proof of performance.

---

## Components of the Score

The LLM Generic Score is composed of five independent dimensions, all derived from **public, declarative model metadata**:

- Functional Capabilities  
- Context and Output Limits  
- Recency and Maintenance  
- Openness and Transparency  
- Cost Efficiency (when available)

Each component is normalized to the range **[0, 1]**.

---

## The Formula

LLM Generic Score (LGS) =
- 0.35 × Capability Score
- 0.20 × Limit Score
- 0.20 × Recency Score
- 0.15 × Openness Score
- 0.10 × Cost Score

Weights are configurable and intentionally biased toward **capability breadth**, not performance claims.

---

## Score Components Explained

### 1. Capability Score

Measures the breadth of declared model features.

This includes support for:
- reasoning
- tool calling
- structured output
- multimodality (text, image, audio)
- attachments or file handling

Each capability is treated as a **binary signal**.  
The score reflects *how many advanced behaviors the model explicitly supports*, not how well it performs them.

---

### 2. Limit Score

Measures the operational capacity of the model.

Derived from:
- maximum context window
- maximum output tokens

Limits are normalized using logarithmic scaling to avoid extreme bias toward very large models.

This component captures **how much information a model can reasonably handle**, not how well it reasons over it.

---

### 3. Recency Score

Estimates how modern and actively maintained the model is.

This combines:
- declared knowledge cutoff
- last updated or release date

A recent knowledge cutoff increases the likelihood of factual relevance.  
Recent updates increase confidence in model maintenance and stability.

Importantly, a recent update does **not** automatically imply new knowledge — it is treated as a maintenance signal, not a retraining guarantee.

---

### 4. Openness Score

Measures transparency and ecosystem friendliness.

Signals include:
- open weights
- publicly documented APIs
- compatibility with common standards (e.g. OpenAI-compatible APIs)

This score rewards models that are easier to inspect, host, adapt, and integrate.

---

### 5. Cost Score

Measures cost efficiency when pricing data is available.

Lower cost for comparable capabilities results in a higher score.  
When cost information is missing or zero, this component defaults to a neutral value.

This prevents penalizing open or self-hosted models.

## Combining LLM and Library Scores

The LLM Generic Score is combined multiplicatively with the **Library Confidence Score (LCS)**:

This produces a **risk-adjusted confidence score** that reflects both:
- how capable the model is in general
- how risky it is to rely on LLMs for a specific library

---

## How to Interpret the Result

A higher score means:
- broader declared capabilities
- lower structural risk
- better suitability as a general-purpose assistant

A lower score means:
- narrower scope or specialization
- higher operational or contextual limits
- greater need for task-specific validation

---

## Why This Model Is Conservative by Design

The LGS intentionally avoids:
- unverifiable training claims
- subjective benchmarks
- prompt-dependent evaluations

It relies only on **what can be stated with confidence from metadata**.

---

## Final Principle

> **We don’t rank models by how impressive they look.  
> We rank them by what they are provably equipped to do.**

This makes the LLM Generic Score transparent, auditable, and safe to combine with large-scale library risk modeling.
