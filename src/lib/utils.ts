import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getVersion(): string {
    try {
        const pkgPath = path.join(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version: string };
        return pkg.version;
    } catch {
        return '0.0.0';
    }
}

export function copyToClipboard(text: string): boolean {
    try {
        execSync(process.platform === 'win32' ? 'clip' : 'pbcopy', { input: text });
        return true;
    } catch {
        return false;
    }
}

export function fuzzyMatch(query: string, text: string): boolean {
    query = query.toLowerCase();
    text = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti++) {
        if (text[ti] === query[qi]) qi++;
    }
    return qi === query.length;
}

export interface Colors {
    green: (s: string) => string;
    yellow: (s: string) => string;
    red: (s: string) => string;
    dim: (s: string) => string;
    bold: (s: string) => string;
    reset: string;
}

export const colors: Colors = {
    green: (s: string) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
    red: (s: string) => `\x1b[31m${s}\x1b[0m`,
    dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
    bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
    reset: '\x1b[0m',
};
