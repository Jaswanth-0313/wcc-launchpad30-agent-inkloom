# AI Brand Architect

AI Brand Architect is a guided brand intelligence workspace for turning a rough product, startup, creator, or community idea into a coherent launch-ready brand system.

## Why it exists

Most brand tools jump from one idea to one generic answer. AI Brand Architect makes the reasoning visible: it clarifies the audience and problem, builds a position, establishes personality, explores naming territories, directs the visual language, critiques weak assumptions, checks consistency, and turns the approved system into launch copy.

## Workflow

1. Discovery: extract the core problem, audience, context, and open question.
2. Positioning: define the category, audience, differentiator, and reason to believe.
3. Personality: choose traits and name the behaviors to avoid.
4. Naming: compare strategically different naming territories rather than random names.
5. Visual direction: connect typography, color, shape, imagery, and logo direction to strategy.
6. AI critic: surface generic language, differentiation gaps, naming stretch, and proof gaps.
7. Consistency guardian: inspect whether strategy, personality, name, voice, and launch copy feel like one brand.
8. Launch kit: produce a headline, pitch, founder message, and shareable snapshot.

## Current implementation

This hackathon-ready frontend is fully runnable without external credentials. It uses a structured central project state and a realistic prepared demo path so judges can experience the complete workflow instantly. The stage boundary is deliberately isolated so model-backed agents can be connected through an API without changing the user journey. The local fallback includes context-derived positioning, naming, anti-generic critique, consistency scoring, and visible Agent Handoff traces.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL. Use **Try a demo project** for the fastest walkthrough, or enter your own idea.

## Build and lint

```bash
npm run build
npm run lint
```

## Environment

Copy `.env.example` to `.env` when connecting a server-side model provider. Secrets must remain server-side; the current demo intentionally has no exposed API keys.

## Project structure

- `src/App.tsx`: workflow state, stage navigation, structured stage surfaces, demo data, anti-generic checks, and export action.
- `src/agents/types.ts`: typed agent context and output contract.
- `src/agents/prompts.ts`: separate role, objective, schema, and constraint definitions for all eight agents.
Inkloom deployment setup.
- `src/index.css`: responsive visual system for the workspace.
- `docs/submission.md`: submission placeholders.
- `docs/demo-script.md`: four-minute demo flow.
- `docs/team-contributions.md`: contribution template.

## Architecture next step

The intended production boundary is a small API layer with one typed agent module per stage. Each agent should receive the approved state from previous stages, return schema-validated JSON, and preserve human edits before later stages run.
