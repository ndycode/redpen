/**
 * Metadata for a skill, defining its capabilities and identity.
 */
export interface SkillMetadata {
  /** Unique name of the skill */
  name: string;
  /** Version string */
  version: string;
  /** Author or maintainer */
  author?: string;
  /** Required redpen version range */
  engines?: {
    redpen: string;
  };
}

/**
 * Definition of a reusable skill (complex task workflow).
 */
export interface SkillDefinition {
  /** Machine-readable name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Phrases or patterns that trigger this skill */
  triggers: string[];
  /** Path to the documentation or implementation of the skill */
  skillMdPath: string;
  /** Classification of the skill purpose */
  category: string;
  /** Optional metadata */
  metadata?: SkillMetadata;
}
