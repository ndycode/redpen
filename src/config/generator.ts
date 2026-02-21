import type { RedpenConfig } from '../types/index.js';

function formatValue(value: unknown): string {
    if (typeof value === 'string') {
        return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => formatValue(v)).join(', ')}]`;
    }
    return `"${String(value)}"`;
}

export function serializeToml(obj: Record<string, unknown>): string {
    const lines: string[] = [];
    const sections: string[] = [];
    const rootKeys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sections.push(`[${key}]`);
            for (const [subKey, subValue] of Object.entries(value)) {
                sections.push(`${subKey} = ${formatValue(subValue)}`);
            }
            sections.push('');
        } else {
            rootKeys.push(`${key} = ${formatValue(value)}`);
        }
    }

    if (rootKeys.length > 0) {
        lines.push(...rootKeys);
        if (sections.length > 0) lines.push('');
    }
    lines.push(...sections);

    return lines.join('\n').trim();
}

export function parseToml(content: string): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = { root: {} };
    let currentSection = 'root';

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const sectionMatch = trimmed.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1]!.trim();
            if (!result[currentSection]) {
                result[currentSection] = {};
            }
            continue;
        }

        const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1]!.trim();
            let valueStr = kvMatch[2]!.trim();
            let value: unknown;

            if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
                value = valueStr.slice(1, -1).replace(/\\"/g, '"');
            } else if (valueStr === 'true') {
                value = true;
            } else if (valueStr === 'false') {
                value = false;
            } else if (!isNaN(Number(valueStr)) && valueStr !== '') {
                value = Number(valueStr);
            } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
                value = valueStr
                    .slice(1, -1)
                    .split(',')
                    .map((v) => {
                        const s = v.trim();
                        if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/\\"/g, '"');
                        if (s === 'true') return true;
                        if (s === 'false') return false;
                        if (!isNaN(Number(s)) && s !== '') return Number(s);
                        return s;
                    });
            } else {
                value = valueStr;
            }

            const section = result[currentSection];
            if (section) section[key] = value;
        }
    }

    return result;
}

export function generateConfig(overrides?: Partial<RedpenConfig>): string {
    const config: Record<string, unknown> = {
        model: {
            tier: overrides?.modelTier ?? 'secondary',
        },
        agents: {
            planner: 'primary',
            executor: 'secondary',
            researcher: 'tertiary',
        },
        team: {
            maxWorkers: overrides?.teamDefaults?.maxWorkers ?? 4,
            useTmux: overrides?.teamDefaults?.useTmux ?? false,
            heartbeatInterval: overrides?.teamDefaults?.heartbeatInterval ?? 30000,
        },
        hud: {
            preset: overrides?.hudPreset ?? 'compact',
            refreshRate: 1000,
        },
    };

    return serializeToml(config);
}

export function mergeConfig(existing: string, overrides: Record<string, unknown>): string {
    const parsed = parseToml(existing);
    
    const data: Record<string, unknown> = { ...parsed['root'] };
    delete parsed['root'];
    Object.assign(data, parsed);

    for (const [section, values] of Object.entries(overrides)) {
        if (typeof values === 'object' && values !== null && !Array.isArray(values)) {
            const existingSection = data[section] as Record<string, unknown> | undefined;
            data[section] = { ...(existingSection || {}), ...(values as object) };
        } else {
            data[section] = values;
        }
    }

    return serializeToml(data);
}
