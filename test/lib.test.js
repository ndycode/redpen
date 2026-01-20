import { describe, it, expect, vi } from 'vitest';

vi.mock('child_process', () => ({
    execSync: vi.fn(() => 'https://github.com/test/repo.git\n'),
}));

const lib = require('../lib');

describe('config', () => {
    describe('getConfigDir', () => {
        it('returns platform-specific path', () => {
            const dir = lib.getConfigDir();
            expect(dir).toContain('redpen');
        });
    });

    describe('getProjectHash', () => {
        it('returns 12 character hash', () => {
            const hash = lib.getProjectHash();
            expect(hash).toHaveLength(12);
            expect(hash).toMatch(/^[a-f0-9]+$/);
        });
    });

    describe('DEFAULTS', () => {
        it('has expected default values', () => {
            expect(lib.DEFAULTS).toEqual({
                platform: 'web',
                frontend: 'nextjs',
                backend: 'supabase',
            });
        });
    });

    describe('detectStack', () => {
        it('returns object with platform', () => {
            const result = lib.detectStack();
            expect(result).toHaveProperty('platform');
            expect(['web', 'mobile']).toContain(result.platform);
        });
    });
});

describe('utils', () => {
    describe('getVersion', () => {
        it('returns version string', () => {
            const version = lib.getVersion();
            expect(version).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });

    describe('fuzzyMatch', () => {
        it('matches exact strings', () => {
            expect(lib.fuzzyMatch('test', 'test')).toBe(true);
        });

        it('matches subsequences', () => {
            expect(lib.fuzzyMatch('abc', 'aXbXcX')).toBe(true);
        });

        it('rejects non-matching strings', () => {
            expect(lib.fuzzyMatch('xyz', 'abc')).toBe(false);
        });

        it('is case insensitive', () => {
            expect(lib.fuzzyMatch('ABC', 'abc')).toBe(true);
            expect(lib.fuzzyMatch('abc', 'ABC')).toBe(true);
        });

        it('handles empty query', () => {
            expect(lib.fuzzyMatch('', 'anything')).toBe(true);
        });
    });

    describe('colors', () => {
        it('exports color functions', () => {
            expect(typeof lib.colors.green).toBe('function');
            expect(typeof lib.colors.yellow).toBe('function');
            expect(typeof lib.colors.dim).toBe('function');
        });

        it('wraps text with ANSI codes', () => {
            const result = lib.colors.green('test');
            expect(result).toContain('\x1b[');
            expect(result).toContain('test');
        });
    });

    describe('copyToClipboard', () => {
        it('is a function', () => {
            expect(typeof lib.copyToClipboard).toBe('function');
        });
    });
});

describe('prompts', () => {
    describe('PROMPTS_DIR', () => {
        it('points to prompts folder', () => {
            expect(lib.PROMPTS_DIR).toContain('prompts');
        });
    });

    describe('CUSTOM_DIR', () => {
        it('points to .redpen folder', () => {
            expect(lib.CUSTOM_DIR).toContain('.redpen');
        });
    });

    describe('getPromptName', () => {
        it('removes .txt extension', () => {
            expect(lib.getPromptName('core/security/code-analysis.txt')).toBe('core/security/code-analysis');
        });

        it('handles paths without extension', () => {
            expect(lib.getPromptName('core/security/test')).toBe('core/security/test');
        });
    });

    describe('getPromptCategory', () => {
        it('extracts category from core paths', () => {
            expect(lib.getPromptCategory('core/security/code-analysis.txt')).toBe('security');
        });

        it('extracts category from web paths', () => {
            expect(lib.getPromptCategory('web/frontend/nextjs/render.txt')).toBe('frontend');
        });

        it('extracts category from mobile paths', () => {
            expect(lib.getPromptCategory('mobile/core/test.txt')).toBe('core');
            expect(lib.getPromptCategory('mobile/flutter/test.txt')).toBe('flutter');
        });

        it('handles custom prompts', () => {
            expect(lib.getPromptCategory('custom/my-check.txt')).toBe('custom');
        });
    });

    describe('resolvePrompt', () => {
        const runOrder = [
            'core/security/code-analysis.txt',
            'core/security/data-integrity.txt',
            'web/frontend/nextjs/render.txt',
        ];

        it('resolves by number', () => {
            expect(lib.resolvePrompt('1', runOrder)).toBe('core/security/code-analysis.txt');
            expect(lib.resolvePrompt('2', runOrder)).toBe('core/security/data-integrity.txt');
        });

        it('resolves by exact path', () => {
            expect(lib.resolvePrompt('core/security/code-analysis.txt', runOrder)).toBe(
                'core/security/code-analysis.txt'
            );
        });

        it('resolves by partial match', () => {
            expect(lib.resolvePrompt('code-analysis', runOrder)).toBe('core/security/code-analysis.txt');
        });

        it('returns null for non-existent', () => {
            expect(lib.resolvePrompt('nonexistent', runOrder)).toBe(null);
            expect(lib.resolvePrompt('999', runOrder)).toBe(null);
        });

        it('handles zero index', () => {
            expect(lib.resolvePrompt('0', runOrder)).toBe(null);
        });
    });

    describe('scanDir', () => {
        it('returns empty array for non-existent directory', () => {
            expect(lib.scanDir('/nonexistent/path')).toEqual([]);
        });
    });

    describe('getRunOrder', () => {
        it('returns array of prompts', () => {
            const order = lib.getRunOrder();
            expect(Array.isArray(order)).toBe(true);
        });
    });
});

describe('progress', () => {
    describe('getBranch', () => {
        it('returns branch name string', () => {
            const branch = lib.getBranch();
            expect(typeof branch).toBe('string');
        });
    });

    describe('getProgress', () => {
        it('returns object with completed array', () => {
            const progress = lib.getProgress();
            expect(progress).toHaveProperty('completed');
            expect(Array.isArray(progress.completed)).toBe(true);
        });
    });
});

describe('prompts-native', () => {
    describe('pressEnter', () => {
        it('is a function', () => {
            expect(typeof lib.pressEnter).toBe('function');
        });
    });

    describe('select', () => {
        it('is a function', () => {
            expect(typeof lib.select).toBe('function');
        });
    });

    describe('separator', () => {
        it('returns object with separator property', () => {
            const sep = lib.separator('test');
            expect(sep).toEqual({ separator: 'test' });
        });

        it('has default separator text', () => {
            const sep = lib.separator();
            expect(sep).toHaveProperty('separator');
            expect(sep.separator.length).toBeGreaterThan(0);
        });
    });
});
