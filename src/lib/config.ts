import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

export interface StackConfig {
    platform: string;
    frontend?: string;
    backend?: string;
    framework?: string;
}

export const DEFAULTS: StackConfig = {
    platform: 'web',
    frontend: 'nextjs',
    backend: 'supabase',
};

export function getConfigDir(): string {
    const home = os.homedir();

    switch (process.platform) {
        case 'win32':
            return path.join(process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming'), 'redpen');
        case 'darwin':
            return path.join(home, 'Library', 'Application Support', 'redpen');
        default:
            return path.join(process.env['XDG_CONFIG_HOME'] ?? path.join(home, '.config'), 'redpen');
    }
}

export function getProjectHash(): string {
    try {
        const remote = execSync('git config --get remote.origin.url', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return createHash('md5').update(remote).digest('hex').slice(0, 12);
    } catch {
        return createHash('md5').update(process.cwd()).digest('hex').slice(0, 12);
    }
}

export function getProjectDir(): string {
    const dir = path.join(getConfigDir(), 'projects', getProjectHash());
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/** @deprecated Use getProjectDir() instead */
export function getProjectConfigDir(): string {
    return getProjectDir();
}

export function getConfigFile(): string {
    return path.join(getProjectDir(), 'config.json');
}

export function loadConfig(): StackConfig | null {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
        try {
            return JSON.parse(fs.readFileSync(configFile, 'utf-8')) as StackConfig;
        } catch {
            return null;
        }
    }
    return null;
}

/** @deprecated Use loadConfig() instead */
export function getConfig(): StackConfig | null {
    return loadConfig();
}

export function saveConfig(config: StackConfig): void {
    fs.writeFileSync(getConfigFile(), JSON.stringify(config, null, 2));
}

export function detectStack(): StackConfig {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pubspecPath = path.join(process.cwd(), 'pubspec.yaml');

    if (fs.existsSync(pubspecPath)) {
        return { platform: 'mobile', framework: 'flutter' };
    }

    if (!fs.existsSync(pkgPath)) {
        return DEFAULTS;
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as {
            dependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };
        const deps: Record<string, string> = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
        };

        if (deps['react-native']) {
            return { platform: 'mobile', framework: 'react-native' };
        }

        const detected: StackConfig = {
            platform: 'web',
            frontend: 'none',
            backend: 'none',
        };

        if (deps['next']) detected.frontend = 'nextjs';
        else if (deps['react']) detected.frontend = 'react';
        else if (deps['vue']) detected.frontend = 'vue';

        if (deps['@supabase/supabase-js']) detected.backend = 'supabase';
        else if (deps['firebase']) detected.backend = 'firebase';
        else if (deps['@prisma/client']) detected.backend = 'prisma';

        return detected;
    } catch {
        return DEFAULTS;
    }
}
