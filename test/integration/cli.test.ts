import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const cliPath = path.resolve(__dirname, '../../dist/cli/index.js');

describe('CLI Integration', () => {
    it('shows version', () => {
        const output = execSync(`node ${cliPath} --version`, { encoding: 'utf8' }).trim();
        expect(output).toMatch(/^2\.\d+\.\d+$/);
    });

    it('shows help', () => {
        const output = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
        expect(output).toContain('redpen <command>');
        expect(output).toContain('v2 Orchestration Commands');
    });

    it('lists agents', () => {
        const output = execSync(`node ${cliPath} agents list`, { encoding: 'utf8' });
        expect(output).toContain('Loaded 31 agents');
    });
});
