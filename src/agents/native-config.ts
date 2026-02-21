import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { AGENT_DEFINITIONS } from './definitions.js';
import { AgentDefinition, ModelTier } from '../types/index.js';
import { ensureDir, getStateDir } from '../state/index.js';

const REASONING_EFFORT_MAP: Record<ModelTier, string> = {
    [ModelTier.Primary]: 'high',
    [ModelTier.Secondary]: 'medium',
    [ModelTier.Tertiary]: 'low',
};

const SKIP_AGENTS = new Set(['deep-executor']);

function stripFrontmatter(content: string): string {
    const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    return match ? content.slice(match[0].length).trim() : content.trim();
}

function escapeTomlMultiline(s: string): string {
    return s.replace(/"{3,}/g, (match) => match.split('').join('\\'));
}

export function generateAgentToml(agent: AgentDefinition, promptContent: string): string {
    const instructions = stripFrontmatter(promptContent);
    const effort = REASONING_EFFORT_MAP[agent.modelTier];
    const escaped = escapeTomlMultiline(instructions);
    return [
        `# redpen agent: ${agent.name}`,
        `model_reasoning_effort = "${effort}"`,
        `developer_instructions = """`,
        escaped,
        `"""`,
        '',
    ].join('\n');
}

export async function generateAllConfigs(outputDir: string, pkgRoot: string): Promise<number> {
    let count = 0;
    await ensureDir(outputDir);

    for (const agent of AGENT_DEFINITIONS) {
        if (SKIP_AGENTS.has(agent.name)) continue;

        const promptPath = join(pkgRoot, agent.systemPromptPath);
        if (!existsSync(promptPath)) continue;

        const promptContent = await readFile(promptPath, 'utf-8');
        const toml = generateAgentToml(agent, promptContent);

        await writeFile(join(outputDir, `${agent.name}.toml`), toml);
        count++;
    }

    return count;
}

export async function syncConfigs(outputDir: string, pkgRoot: string): Promise<number> {
    let count = 0;
    await ensureDir(outputDir);

    for (const agent of AGENT_DEFINITIONS) {
        if (SKIP_AGENTS.has(agent.name)) continue;

        const promptPath = join(pkgRoot, agent.systemPromptPath);
        if (!existsSync(promptPath)) continue;

        const promptContent = await readFile(promptPath, 'utf-8');
        const toml = generateAgentToml(agent, promptContent);

        const targetPath = join(outputDir, `${agent.name}.toml`);
        let existing = '';
        if (existsSync(targetPath)) {
            existing = await readFile(targetPath, 'utf-8');
        }

        if (existing !== toml) {
            await writeFile(targetPath, toml);
            count++;
        }
    }

    return count;
}

export async function installNativeAgentConfigs(pkgRoot: string): Promise<number> {
    const agentConfigDir = join(getStateDir(), 'agents');
    return syncConfigs(agentConfigDir, pkgRoot);
}
