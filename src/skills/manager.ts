import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { getSkillsDir } from '../state/paths.js';
import type { SkillDefinition } from '../types/index.js';
import { loadSkills } from './loader.js';

export async function addSkill(name: string, content: string): Promise<void> {
    const skillsDir = await getSkillsDir();
    const skillDir = join(skillsDir, name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), content, 'utf-8');
}

export async function removeSkill(name: string): Promise<boolean> {
    const skillsDir = await getSkillsDir();
    const skillMdPath = join(skillsDir, name, 'SKILL.md');
    try {
        await unlink(skillMdPath);
        return true;
    } catch {
        return false;
    }
}

export function searchSkills(query: string, skills: SkillDefinition[]): SkillDefinition[] {
    const q = query.toLowerCase();
    return skills.filter((skill) => {
        if (skill.name.toLowerCase().includes(q)) return true;
        if (skill.description.toLowerCase().includes(q)) return true;
        if (skill.triggers.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
    });
}

export async function listSkills(): Promise<SkillDefinition[]> {
    return loadSkills();
}

export async function editSkill(name: string): Promise<void> {
    const skillsDir = await getSkillsDir();
    const skillMdPath = join(skillsDir, name, 'SKILL.md');
    const editor = process.env['EDITOR'] ?? process.env['VISUAL'] ?? 'notepad';

    await new Promise<void>((resolve, reject) => {
        const child = spawn(editor, [skillMdPath], { stdio: 'inherit', shell: true });
        child.on('close', (code) => {
            if (code === 0 || code === null) {
                resolve();
            } else {
                reject(new Error(`Editor exited with code ${code}`));
            }
        });
        child.on('error', reject);
    });
}
