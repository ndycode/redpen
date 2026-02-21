import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const cliPath = path.resolve(__dirname, '../../dist/cli/index.js');

describe('TUI Integration', () => {
    it('runs TUI and exits cleanly when quitting', () => {
        // Run interactive mode but send 'q' immediately via stdin
        const result = spawnSync(process.execPath, [cliPath, 'interactive'], {
            input: 'q\n',
            encoding: 'utf8'
        });

        // The TUI should start and then exit cleanly
        expect(result.status).toBe(0);
        expect(result.stdout.replace(/[[0-9;]*[mhlH]/g, '')).toContain('redpen');
    });
});
