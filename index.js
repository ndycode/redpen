/**
 * redpen - Senior engineer review system in a box
 * 
 * Production-grade prompts for auditing AI-assisted codebases.
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, 'prompts');

/**
 * Get prompt content by name
 * @param {string} name - Prompt name (e.g., 'auth-data-safety')
 * @returns {string} Prompt content
 */
function getPrompt(name) {
    const filename = name.endsWith('-prompt.txt') ? name : `${name}-prompt.txt`;
    const fullPath = path.join(PROMPTS_DIR, filename);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Prompt not found: ${name}`);
    }

    return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * List all available prompts
 * @returns {string[]} Array of prompt names
 */
function listPrompts() {
    const prompts = [];

    function scanDir(dir, prefix = '') {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory() && !['workflow', 'examples'].includes(file)) {
                scanDir(fullPath, prefix + file + '/');
            } else if (file.endsWith('-prompt.txt')) {
                prompts.push(prefix + file.replace('-prompt.txt', ''));
            }
        }
    }

    scanDir(PROMPTS_DIR);
    return prompts;
}

/**
 * Get the canonical run order
 * @returns {string[]} Array of prompt filenames in order
 */
function getRunOrder() {
    return [
        'security/code-analysis.txt',
        'security/authorization-boundaries.txt',
        'security/data-integrity.txt',
        'security/state-invariants.txt',
        'security/impact-analysis.txt',
        'security/api-ergonomics.txt',
        'architecture/render-performance.txt',
        'architecture/operational-health.txt',
        'architecture/system-optimization.txt',
        'quality/behavioral-coverage.txt',
        'interface/design-system.txt',
        'interface/component-architecture.txt',
        'interface/visual-consistency.txt',
        'interface/accessibility-core.txt',
        'interface/rendering-performance.txt',
        'product/voice-tone.txt',
        'growth/editorial-standards.txt',
        'interface/mobile/responsive-layout.txt',
        'interface/mobile/ergonomic-reach.txt',
        'interface/mobile/touch-targets.txt',
        'interface/mobile/input-interaction.txt',
        'interface/mobile/mobile-performance.txt',
        'interface/mobile/information-density.txt',
        'interface/resilience-ux.txt',
        'interface/visual-refactoring.txt',
        'interface/quality-standards.txt',
        'growth/conversion-layout.txt',
        'process/documentation-integrity.txt',
        'process/code-review-standards.txt'
    ];
}

module.exports = {
    getPrompt,
    listPrompts,
    getRunOrder,
    PROMPTS_DIR
};
