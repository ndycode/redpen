import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, DEFAULTS } from './config.js';
import type { PromptMetadata } from '../types/prompt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');
export const CUSTOM_DIR = path.join(process.cwd(), '.redpen');

export function scanDir(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => fs.statSync(path.join(dir, f)).isFile() && f.endsWith('.txt'))
        .map((f) => path.join(dir, f))
        .sort();
}

export function scanDirRecursive(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const files: string[] = [];
    fs.readdirSync(dir).forEach((f) => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory() && f !== 'workflow') {
            files.push(...scanDirRecursive(full));
        } else if (stat.isFile() && f.endsWith('.txt')) {
            files.push(full);
        }
    });
    return files.sort();
}

export interface ParsedFrontmatter {
    metadata: Partial<PromptMetadata> | null;
    body: string;
}

export function parsePromptMetadata(content: string): ParsedFrontmatter {
    if (!content.startsWith('---\n')) {
        return { metadata: null, body: content };
    }

    const endIndex = content.indexOf('\n---', 4);
    if (endIndex === -1) {
        return { metadata: null, body: content };
    }

    const frontmatter = content.slice(4, endIndex);
    const body = content.slice(endIndex + 4).replace(/^\n/, '');

    const metadata: Partial<PromptMetadata> = {};

    const lines = frontmatter.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line) {
            i++;
            continue;
        }

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
            i++;
            continue;
        }

        const key = line.slice(0, colonIndex).trim();
        const rest = line.slice(colonIndex + 1).trim();

        if (rest === '' || rest === '[]') {
            if (rest === '[]') {
                if (key === 'tags') metadata.tags = [];
            }
            i++;

            const listItems: string[] = [];
            while (i < lines.length) {
                const nextLine = lines[i] ?? '';
                const itemMatch = /^\s+-\s+(.+)$/.exec(nextLine);
                if (itemMatch) {
                    const item = itemMatch[1];
                    if (item !== undefined) listItems.push(item.trim());
                    i++;
                } else {
                    break;
                }
            }

            if (listItems.length > 0 && key === 'tags') {
                metadata.tags = listItems;
            }
            continue;
        }

        if (rest.startsWith('[') && rest.endsWith(']')) {
            const inner = rest.slice(1, -1);
            const items = inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
            if (key === 'tags') metadata.tags = items;
        } else {
            switch (key) {
                case 'title':
                    metadata.title = rest;
                    break;
                case 'category':
                    metadata.category = rest;
                    break;
                case 'subcategory':
                    metadata.subcategory = rest;
                    break;
                case 'difficulty':
                    metadata.difficulty = rest;
                    break;
                case 'version':
                    metadata.version = rest;
                    break;
                case 'author':
                    metadata.author = rest;
                    break;
                case 'priority':
                    metadata.priority = parseInt(rest, 10);
                    break;
            }
        }

        i++;
    }

    return { metadata, body };
}

export function buildRunOrder(config: typeof DEFAULTS): string[] {
    const prompts: string[] = [];

    for (const category of ['security', 'quality', 'architecture', 'process']) {
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'core', category)));
    }

    if (config.platform === 'mobile') {
        prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', 'core')));
        if (config.framework && config.framework !== 'none') {
            prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', config.framework)));
        }
    } else {
        if (config.frontend && config.frontend !== 'none') {
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'frontend', config.frontend)));
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'interface')));
        }
        if (config.backend && config.backend !== 'none') {
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'backend', config.backend)));
        }
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'product')));
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'growth')));
    }

    if (fs.existsSync(CUSTOM_DIR)) {
        prompts.push(...scanDirRecursive(CUSTOM_DIR));
    }

    return prompts.map((p) => {
        if (p.startsWith(CUSTOM_DIR)) {
            return 'custom/' + path.relative(CUSTOM_DIR, p).replace(/\\/g, '/');
        }
        return path.relative(PROMPTS_DIR, p).replace(/\\/g, '/');
    });
}

export function getRunOrder(): string[] {
    const config = loadConfig() ?? DEFAULTS;
    return buildRunOrder(config);
}

export function getPromptContent(promptPath: string): string | null {
    const fullPath = promptPath.startsWith('custom/')
        ? path.join(CUSTOM_DIR, promptPath.replace('custom/', ''))
        : path.join(PROMPTS_DIR, promptPath);

    if (!fs.existsSync(fullPath)) {
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

export function loadPrompt(promptPath: string): string | null {
    return getPromptContent(promptPath);
}

export function getPromptFullPath(promptPath: string): string {
    if (promptPath.startsWith('custom/')) {
        return path.join(CUSTOM_DIR, promptPath.replace('custom/', ''));
    }
    return path.join(PROMPTS_DIR, promptPath);
}

export function resolvePrompt(arg: string, runOrder: string[]): string | null {
    if (/^\d+$/.test(arg)) {
        const index = parseInt(arg, 10) - 1;
        if (index >= 0 && index < runOrder.length) {
            return runOrder[index] ?? null;
        }
        return null;
    }

    const exactMatch = runOrder.find((p) => p === arg || p === `${arg}.txt` || p.endsWith(`/${arg}.txt`));
    if (exactMatch) return exactMatch;

    const partialMatch = runOrder.find((p) => p.includes(arg));
    return partialMatch ?? null;
}

export function getPromptName(promptPath: string): string {
    return promptPath.replace('.txt', '');
}

export function getPromptCategory(promptPath: string): string {
    const parts = promptPath.split('/');
    const first = parts[0];
    if (first === 'core') return parts[1] ?? first;
    if (first === 'web') return parts[1] ?? first;
    if (first === 'mobile') return parts.length > 2 ? (parts[1] ?? 'mobile') : 'mobile';
    return first ?? 'unknown';
}
