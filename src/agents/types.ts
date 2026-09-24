export type AgentStage = 'discovery' | 'positioning' | 'personality' | 'naming' | 'visual' | 'critic' | 'consistency' | 'launch'

export type AgentContext = {
  idea: string
  audience: string
  problem: string
  constraints: string
  approvedDecisions: Record<string, unknown>
}

export type AgentPrompt = {
  stage: AgentStage
  role: string
  objective: string
  requiredFields: string[]
  constraints: string[]
}
