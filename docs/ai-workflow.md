# AI Workflow

AI Brand Architect is designed as a chain of specialized agents, not one giant prompt.

1. Discovery turns the rough idea into audience, problem, context, goals, constraints, assumptions, and open questions.
2. Positioning consumes approved discovery and produces category, value proposition, differentiator, and reasons to believe.
3. Personality consumes the strategy and defines traits, expression, and traits to avoid.
4. Naming consumes strategy and personality and compares distinct naming territories.
5. Visual consumes the approved name and personality to create a connected visual direction.
6. Critic independently challenges generic language, weak proof, audience fit, naming stretch, and messaging.
7. Consistency compares the whole system and explains every pass or warning.
8. Launch consumes approved decisions to produce practical market-facing copy.

Every real agent should return structured JSON matching the fields in `src/agents/prompts.ts`. The client fallback follows the same information flow and exposes an Agent Handoff panel so judges can see which context each stage used.
