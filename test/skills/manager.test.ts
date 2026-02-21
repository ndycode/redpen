import { describe, it, expect } from 'vitest';
import { listSkills } from '../../src/skills/index.js';

describe('skill manager', () => {
    it('lists available skills', async () => {
        const skills = await listSkills();
        expect(Array.isArray(skills)).toBe(true);
        // Should find the 3 skills we added: analyze, code-review, security-review
        expect(skills.length).toBeGreaterThanOrEqual(3);
    });
});
