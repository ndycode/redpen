/**
 * Agent role definitions for Redpen v2.
 * Each agent has a name, description, default model tier, tool access pattern,
 * and a path to its system prompt instructions.
 *
 * Prompt files are loaded from the prompts/ai/agents/ directory at runtime.
 */

import { AgentDefinition, AgentCategory, ModelTier } from '../types/index.js';

export const AGENT_DEFINITIONS: AgentDefinition[] = [
    // ── Build / Planning Lane ────────────────────────────────────────────────
    {
        name: 'explore',
        displayName: 'Explorer',
        description: 'Fast codebase search and file/symbol mapping',
        modelTier: ModelTier.Tertiary,
        tools: ['read-only', 'glob', 'grep', 'read'],
        systemPromptPath: 'prompts/ai/agents/a-explore.txt',
        category: AgentCategory.Research,
    },
    {
        name: 'analyst',
        displayName: 'Analyst',
        description: 'Requirements clarity, acceptance criteria, hidden constraints',
        modelTier: ModelTier.Primary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-analyst.txt',
        category: AgentCategory.Planning,
    },
    {
        name: 'planner',
        displayName: 'Planner',
        description: 'Task sequencing, execution plans, risk flags',
        modelTier: ModelTier.Primary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-planner.txt',
        category: AgentCategory.Planning,
    },
    {
        name: 'architect',
        displayName: 'Architect',
        description: 'System design, boundaries, interfaces, long-horizon tradeoffs',
        modelTier: ModelTier.Primary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-architect.txt',
        category: AgentCategory.Planning,
    },
    {
        name: 'debugger',
        displayName: 'Debugger',
        description: 'Root-cause analysis, regression isolation, failure diagnosis',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-debugger.txt',
        category: AgentCategory.Execution,
    },
    {
        name: 'executor',
        displayName: 'Executor',
        description: 'Code implementation, refactoring, feature work',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'write', 'edit', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-executor.txt',
        category: AgentCategory.Execution,
    },
    {
        name: 'deep-executor',
        displayName: 'Deep Executor',
        description: '[Deprecated] Backward-compatible alias of executor',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'write', 'edit', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-deep-executor.txt',
        category: AgentCategory.Execution,
    },
    {
        name: 'verifier',
        displayName: 'Verifier',
        description: 'Completion evidence, claim validation, test adequacy',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-verifier.txt',
        category: AgentCategory.Execution,
    },

    // ── Review Lane ──────────────────────────────────────────────────────────
    {
        name: 'style-reviewer',
        displayName: 'Style Reviewer',
        description: 'Formatting, naming, idioms, lint conventions',
        modelTier: ModelTier.Tertiary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-style-reviewer.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'quality-reviewer',
        displayName: 'Quality Reviewer',
        description: 'Logic defects, maintainability, anti-patterns',
        modelTier: ModelTier.Secondary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-quality-reviewer.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'api-reviewer',
        displayName: 'API Reviewer',
        description: 'API contracts, versioning, backward compatibility',
        modelTier: ModelTier.Secondary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-api-reviewer.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'security-reviewer',
        displayName: 'Security Reviewer',
        description: 'Vulnerabilities, trust boundaries, authn/authz',
        modelTier: ModelTier.Secondary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-security-reviewer.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'performance-reviewer',
        displayName: 'Performance Reviewer',
        description: 'Hotspots, complexity, memory/latency optimization',
        modelTier: ModelTier.Secondary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-performance-reviewer.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'code-reviewer',
        displayName: 'Code Reviewer',
        description: 'Comprehensive review across all concerns',
        modelTier: ModelTier.Primary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-code-reviewer.txt',
        category: AgentCategory.Review,
    },

    // ── Domain Specialists ───────────────────────────────────────────────────
    {
        name: 'dependency-expert',
        displayName: 'Dependency Expert',
        description: 'External SDK/API/package evaluation',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'web'],
        systemPromptPath: 'prompts/ai/agents/a-dependency-expert.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'test-engineer',
        displayName: 'Test Engineer',
        description: 'Test strategy, coverage, flaky-test hardening',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'write', 'edit', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-test-engineer.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'quality-strategist',
        displayName: 'Quality Strategist',
        description: 'Quality strategy, release readiness, risk assessment',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-quality-strategist.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'build-fixer',
        displayName: 'Build Fixer',
        description: 'Build/toolchain/type failures resolution',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'write', 'edit', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-build-fixer.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'designer',
        displayName: 'Designer',
        description: 'UX/UI architecture, interaction design',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'write', 'edit'],
        systemPromptPath: 'prompts/ai/agents/a-designer.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'writer',
        displayName: 'Writer',
        description: 'Documentation, migration notes, user guidance',
        modelTier: ModelTier.Tertiary,
        tools: ['read', 'write', 'edit'],
        systemPromptPath: 'prompts/ai/agents/a-writer.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'qa-tester',
        displayName: 'QA Tester',
        description: 'Interactive CLI/service runtime validation',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-qa-tester.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'scientist',
        displayName: 'Scientist',
        description: 'Data/statistical analysis and hypothesis testing',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'data'],
        systemPromptPath: 'prompts/ai/agents/a-scientist.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'git-master',
        displayName: 'Git Master',
        description: 'Commit strategy, history hygiene, rebasing',
        modelTier: ModelTier.Secondary,
        tools: ['read', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-git-master.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'code-simplifier',
        displayName: 'Code Simplifier',
        description: 'Simplifies recently modified code for clarity and consistency without changing behavior',
        modelTier: ModelTier.Primary,
        tools: ['read', 'write', 'edit', 'bash'],
        systemPromptPath: 'prompts/ai/agents/a-code-simplifier.txt',
        category: AgentCategory.Specialized,
    },
    {
        name: 'researcher',
        displayName: 'Researcher',
        description: 'External documentation and reference research',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'web'],
        systemPromptPath: 'prompts/ai/agents/a-researcher.txt',
        category: AgentCategory.Research,
    },

    // ── Product Lane ─────────────────────────────────────────────────────────
    {
        name: 'product-manager',
        displayName: 'Product Manager',
        description: 'Problem framing, personas/JTBD, PRDs',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-product-manager.txt',
        category: AgentCategory.Planning,
    },
    {
        name: 'ux-researcher',
        displayName: 'UX Researcher',
        description: 'Heuristic audits, usability, accessibility',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-ux-researcher.txt',
        category: AgentCategory.Research,
    },
    {
        name: 'information-architect',
        displayName: 'Information Architect',
        description: 'Taxonomy, navigation, findability',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis'],
        systemPromptPath: 'prompts/ai/agents/a-information-architect.txt',
        category: AgentCategory.Planning,
    },
    {
        name: 'product-analyst',
        displayName: 'Product Analyst',
        description: 'Product metrics, funnel analysis, experiments',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'analysis', 'data'],
        systemPromptPath: 'prompts/ai/agents/a-product-analyst.txt',
        category: AgentCategory.Research,
    },

    // ── Coordination ─────────────────────────────────────────────────────────
    {
        name: 'critic',
        displayName: 'Critic',
        description: 'Plan/design critical challenge and review',
        modelTier: ModelTier.Primary,
        tools: ['read-only'],
        systemPromptPath: 'prompts/ai/agents/a-critic.txt',
        category: AgentCategory.Review,
    },
    {
        name: 'vision',
        displayName: 'Vision',
        description: 'Image/screenshot/diagram analysis',
        modelTier: ModelTier.Secondary,
        tools: ['read-only', 'multimodal'],
        systemPromptPath: 'prompts/ai/agents/a-vision.txt',
        category: AgentCategory.Research,
    },
];

/** Get agent definition by name */
export function getAgent(name: string): AgentDefinition | undefined {
    return AGENT_DEFINITIONS.find((a) => a.name === name);
}

/** Get all agents in a category */
export function getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
    return AGENT_DEFINITIONS.filter((a) => a.category === category);
}

/** Get all agents at a given model tier */
export function getAgentsByTier(tier: ModelTier): AgentDefinition[] {
    return AGENT_DEFINITIONS.filter((a) => a.modelTier === tier);
}
