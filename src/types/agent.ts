/**
 * Tiers for model capability and cost.
 */
export enum ModelTier {
  /** High-capability, high-cost model (e.g., Opus, GPT-4o) */
  Primary = 'primary',
  /** Balanced capability and cost (e.g., Sonnet) */
  Secondary = 'secondary',
  /** Fast, low-cost model (e.g., Haiku) */
  Tertiary = 'tertiary'
}

/**
 * High-level categories for agents.
 */
export enum AgentCategory {
  /** Strategizing and task breakdown */
  Planning = 'planning',
  /** Code implementation and refactoring */
  Execution = 'execution',
  /** Quality assurance and code review */
  Review = 'review',
  /** Information gathering and documentation */
  Research = 'research',
  /** Narrow-scope domain expertise */
  Specialized = 'specialized'
}

/**
 * Definition of an agent in the Redpen system.
 */
export interface AgentDefinition {
  /** Unique machine-readable name */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Brief description of the agent's purpose */
  description: string;
  /** Default model tier for this agent */
  modelTier: ModelTier;
  /** List of tools or tool patterns the agent can access */
  tools: string[];
  /** Path to the agent's system prompt instructions */
  systemPromptPath: string;
  /** Broad category for the agent */
  category: AgentCategory;
}
