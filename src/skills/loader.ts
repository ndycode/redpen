import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSkillsDir } from '../state/paths.js';
import type { SkillDefinition } from '../types/index.js';

const LOCAL_SKILLS_DIR = join(process.cwd(), 'skills');

export function parseSkillMd(content: string, skillMdPath: string): SkillDefinition {
    const name = extractFrontmatterField(content, 'name') ?? deriveNameFromPath(skillMdPath);
    const description = extractFrontmatterField(content, 'description') ?? '';
    const category = extractFrontmatterField(content, 'category') ?? 'general';
    const triggersRaw = extractFrontmatterField(content, 'triggers');
    const triggers = triggersRaw !== null ? parseYamlList(content, 'triggers') : [];

    return { name, description, triggers, category, skillMdPath };
}

/**
 * Extract a simple string value from YAML frontmatter.
 * Handles: `key: value` on a single line.
 */
function extractFrontmatterField(content: string, key: string): string | null {
    if (!content.startsWith('---')) return null;

    const endIndex = content.indexOf('\n---', 4);
    if (endIndex === -1) return null;

    const frontmatter = content.slice(4, endIndex);
    const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const match = pattern.exec(frontmatter);
    if (!match) return null;

    const value = match[1]?.trim() ?? '';
    if (value === '' || value === '[]') return null;
    if (value.startsWith('[')) return value;
    return value;
}

/**
 * Parse a YAML list field from frontmatter (inline or block style).
 * Supports:
 *   triggers: [a, b, c]
 *   triggers:
 *     - a
 *     - b
 */
function parseYamlList(content: string, key: string): string[] {
    if (!content.startsWith('---')) return [];

    const endIndex = content.indexOf('\n---', 4);
    if (endIndex === -1) return [];

    const frontmatter = content.slice(4, endIndex);
    const lines = frontmatter.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const k = line.slice(0, colonIdx).trim();
        if (k !== key) continue;

        const rest = line.slice(colonIdx + 1).trim();

        // Inline list: triggers: [a, b, c]
        if (rest.startsWith('[') && rest.endsWith(']')) {
            const inner = rest.slice(1, -1);
            return inner
                .split(',')
                .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
                .filter((s) => s.length > 0);
        }

        // Block list: triggers:\n  - a\n  - b
        const items: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
            const next = lines[j] ?? '';
            const itemMatch = /^\s+-\s+(.+)$/.exec(next);
            if (itemMatch) {
                const item = itemMatch[1]?.trim();
                if (item) items.push(item);
            } else if (next.trim().length > 0 && !next.startsWith(' ') && !next.startsWith('\t')) {
                break;
            }
        }
        return items;
    }

    return [];
}

/**
 * Derive a skill name from its file path (e.g. "skills/analyze/SKILL.md" → "analyze").
 */
function deriveNameFromPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const parts = normalized.split('/');
    // Walk backwards to find the directory containing SKILL.md
    for (let i = parts.length - 2; i >= 0; i--) {
        const part = parts[i];
        if (part && part !== 'skills') return part;
    }
    return 'unknown';
}

/**
 * Load all skills from a directory that contains subdirectories with SKILL.md files.
 * Returns empty array if directory is missing or unreadable.
 */
async function loadSkillsFromDir(dir: string): Promise<SkillDefinition[]> {
    let entries: string[];
    try {
        entries = await readdir(dir);
    } catch {
        // Directory doesn't exist or isn't readable — not an error
        return [];
    }

    const skills: SkillDefinition[] = [];

    for (const entry of entries) {
        const skillMdPath = join(dir, entry, 'SKILL.md');
        let content: string;
        try {
            content = await readFile(skillMdPath, 'utf-8');
        } catch {
            // No SKILL.md in this subdirectory — skip
            continue;
        }

        try {
            const skill = parseSkillMd(content, skillMdPath);
            skills.push(skill);
        } catch {
            // Malformed SKILL.md — skip gracefully
        }
    }

    return skills;
}

/**
 * Load skills from local (project) and global (user) skills directories.
 * Local skills take precedence over global on name collision.
 *
 * @param dirs - Optional override directories (for testing). Defaults to local + global.
 */
export async function loadSkills(dirs?: string[]): Promise<SkillDefinition[]> {
    let directories: string[];

    if (dirs !== undefined) {
        directories = dirs;
    } else {
        const globalSkillsDir = await getSkillsDir();
        directories = [LOCAL_SKILLS_DIR, globalSkillsDir];
    }

    // Load all directories, local first so they can override global
    const allSkills: SkillDefinition[] = [];
    for (const dir of directories) {
        const skills = await loadSkillsFromDir(dir);
        allSkills.push(...skills);
    }

    // Deduplicate: first occurrence wins (local before global)
    const seen = new Set<string>();
    const deduplicated: SkillDefinition[] = [];
    for (const skill of allSkills) {
        if (!seen.has(skill.name)) {
            seen.add(skill.name);
            deduplicated.push(skill);
        }
    }

    return deduplicated;
}
