import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { getProjectDir } from './config.js';
import { getVersion } from './utils.js';

export interface Progress {
    completed: string[];
    skipped?: string[];
    versions?: Record<string, string>;
}

export function getBranch(): string | null {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch {
        return null;
    }
}

export function getProgressFile(): string {
    const branch = getBranch();
    const filename = branch ? `progress-${branch.replace(/[^a-zA-Z0-9-]/g, '-')}.json` : 'progress.json';
    return path.join(getProjectDir(), filename);
}

export function getProgress(): Progress {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        try {
            return JSON.parse(fs.readFileSync(progressFile, 'utf-8')) as Progress;
        } catch {
            return { completed: [] };
        }
    }
    return { completed: [] };
}

export function setProgress(progress: Progress): void {
    fs.writeFileSync(getProgressFile(), JSON.stringify(progress, null, 2));
}

export function saveProgress(progress: Progress): void {
    setProgress(progress);
}

export function markDone(promptPath: string): Progress {
    const progress = getProgress();
    if (!progress.completed.includes(promptPath)) {
        progress.completed.push(promptPath);
        if (!progress.versions) progress.versions = {};
        progress.versions[promptPath] = getVersion();
        setProgress(progress);
    }
    return progress;
}

export function markSkipped(promptPath: string): Progress {
    const progress = getProgress();
    if (!progress.skipped) progress.skipped = [];
    if (!progress.skipped.includes(promptPath)) {
        progress.skipped.push(promptPath);
        setProgress(progress);
    }
    return progress;
}

export function undo(): string | null {
    const progress = getProgress();
    if (progress.completed.length === 0) {
        return null;
    }
    const last = progress.completed.pop();
    if (last !== undefined && progress.versions) {
        delete progress.versions[last];
    }
    setProgress(progress);
    return last ?? null;
}

export function undoLast(): string | null {
    return undo();
}

export function resetProgress(): void {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
    }
}
