We need to improve the current UI and backend behavior with the following requirements. Please be precise, pragmatic, and assume production-quality standards.

Frontend (UI/UX)

Libraries Pagination

Add pagination to the libraries results on the frontend.

Pagination must be performant and compatible with server-side pagination.

Dropdown Improvements

All dropdowns must:

Be scrollable when content exceeds max height.

Be filterable (type-to-filter).

Show cursor: pointer on hover.

Buttons must also show cursor: pointer.

Search Bar Behavior

Remove LLM selection from the main search bar.

LLM selection must be disabled by default.

Enable LLM selection only after a library has been selected.

Backend & Logging

Logging

Use Pino for logging.

Add comprehensive logs for:

Incoming API requests

Outgoing API calls

Errors and edge cases

Do not log full API responses — only relevant metadata (status, timing, identifiers).

Library Scoring & Versioning (Stateless)

Stateless Scoring Engine

Implement a stateless scoring mechanism for libraries.

No database persistence is required.

Remove library and version tables entirely.

Scoring Endpoint

Create an endpoint that receives:

LLM

library

The endpoint must:

Compute scores dynamically

Return library versions grouped into version buckets

Order versions by score (highest first)

Breaking Changes Detection

Identify versions that may contain breaking changes.

For now, assume:

Major version changes = possible breaking changes

Keep this logic simple and easily replaceable, as it will later be handled by an LLM.

Clearly flag versions with possible breaking changes in the response.

Output Expectations

Keep the implementation modular and easy to evolve.

Favor readability and maintainability over premature optimization.

Clearly explain assumptions where needed.

Implement unit tests for everything in the backend covering edge cases. Use faker for generating test data, and factory pattern for creating test objects.