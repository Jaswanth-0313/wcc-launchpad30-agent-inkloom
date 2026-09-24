# Architecture

The current product is a Vite React TypeScript client with a single central `BrandState`. The state is intentionally structured around approved decisions rather than chat transcripts. Each workflow stage reads the previous stage's fields and writes only its own decisions.

## Runtime flow

`Intake -> derive discovery -> approve -> positioning -> personality -> naming -> visual -> critic -> consistency -> launch -> dashboard`

The local intelligence fallback is deterministic so a judge can run the complete workflow without credentials. The typed contracts in `src/agents/types.ts` and stage prompt registry in `src/agents/prompts.ts` define the server-side boundary for real LLM calls.

## Production AI boundary

A FastAPI service can accept `{ stage, context }`, select the matching prompt contract, call a provider with structured JSON output, validate required fields, retry malformed responses with a correction prompt, and return a typed stage result. API keys must stay on that server. The UI already preserves stage context and human edits, so a provider can be added without changing the workflow.

## Reliability choices

- No external API is required for the demo.
- Incomplete intake fields receive explicit assumptions rather than invented market facts.
- Critic output is independent from the generation surfaces and can reduce the consistency score.
- Human approval is stored per stage and prior stages remain reachable.
