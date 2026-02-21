import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { platform, homedir } from 'node:os';
import { createHash } from 'node:crypto';

export function getStateDir(): string {
    const home = homedir();

    switch (platform()) {
        case 'win32':
            return join(process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), 'redpen');
        case 'darwin':
            return join(home, 'Library', 'Application Support', 'redpen');
        default:
            return join(process.env['XDG_CONFIG_HOME'] ?? join(home, '.config'), 'redpen');
    }
}

export async function ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
}

function projectHash(input: string): string {
    return createHash('md5').update(input).digest('hex').slice(0, 12);
}

export async function getProjectDir(gitRemoteUrl?: string): Promise<string> {
    const input = gitRemoteUrl ?? process.cwd();
    const hash = projectHash(input);
    const dir = join(getStateDir(), 'projects', hash);
    await ensureDir(dir);
    return dir;
}

export async function getTeamDir(): Promise<string> {
    const dir = join(getStateDir(), 'state', 'team');
    await ensureDir(dir);
    return dir;
}

export async function getHudDir(): Promise<string> {
    const dir = join(getStateDir(), 'state', 'hud');
    await ensureDir(dir);
    return dir;
}

export async function getHooksDir(): Promise<string> {
    const dir = join(getStateDir(), 'state', 'hooks');
    await ensureDir(dir);
    return dir;
}

export async function getSkillsDir(): Promise<string> {
    const dir = join(getStateDir(), 'skills');
    await ensureDir(dir);
    return dir;
}
