/**
 * Metadata for a prompt file, typically defined in YAML frontmatter.
 */
export interface PromptMetadata {
  /** The title of the prompt */
  title: string;
  /** Primary category (e.g., security, quality) */
  category: string;
  /** Subcategory for finer grouping */
  subcategory?: string;
  /** Tags for searching and filtering */
  tags: string[];
  /** Difficulty level (e.g., beginner, intermediate, advanced) */
  difficulty?: string;
  /** Priority for run order (higher is earlier) */
  priority?: number;
  /** Version of the prompt file */
  version: string;
  /** Author of the prompt */
  author?: string;
}

/**
 * Represents a single prompt file and its metadata.
 */
export interface PromptFile {
  /** Relative path to the prompt file */
  path: string;
  /** Full filesystem path */
  fullPath: string;
  /** Name derived from the filename */
  name: string;
  /** Parsed metadata from the file */
  metadata: PromptMetadata;
  /** Raw content of the prompt (optional if not loaded) */
  content?: string;
}

/**
 * Enumeration of prompt categories.
 */
export type PromptCategory =
  | 'security'
  | 'quality'
  | 'architecture'
  | 'process'
  | 'mobile'
  | 'web'
  | 'custom';

/**
 * The order in which prompts should be executed.
 */
export type PromptRunOrder = string[];

/**
 * Progress tracking for a prompt execution session.
 */
export interface PromptProgress {
  /** List of completed prompt paths */
  completed: string[];
  /** List of skipped prompt paths */
  skipped: string[];
  /** Mapping of prompt path to version at time of completion */
  versions: Record<string, string>;
}
