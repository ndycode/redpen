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
        'safety/analysis-prompt.txt',
        'safety/auth-data-safety-prompt.txt',
        'safety/data-consistency-prompt.txt',
        'safety/invariant-prompt.txt',
        'safety/blast-radius-prompt.txt',
        'safety/human-error-prompt.txt',
        'framework/nextjs-rendering-prompt.txt',
        'framework/operability-prompt.txt',
        'framework/optimization-prompt.txt',
        'testing/test-generation-prompt.txt',
        'ui/design-tokens-enforcement-prompt.txt',
        'ui/ui-components-audit-prompt.txt',
        'ui/ui-consistency-audit-prompt.txt',
        'ui/ui-accessibility-prompt.txt',
        'ui/ui-performance-prompt.txt',
        'content/product-copy-voice-guide-prompt.txt',
        'marketing/content-density-and-editorial-quality-prompt.txt',
        'ui/mobile/mobile-responsive-layout-audit-prompt.txt',
        'ui/mobile/mobile-navigation-and-thumb-reach-prompt.txt',
        'ui/mobile/mobile-a11y-touch-audit-prompt.txt',
        'ui/mobile/mobile-forms-inputs-prompt.txt',
        'ui/mobile/mobile-performance-and-hydration-prompt.txt',
        'ui/mobile/mobile-visual-density-and-readability-prompt.txt',
        'ui/error-boundary-and-fallback-ux-prompt.txt',
        'ui/ui-redesign-prompt.txt',
        'ui/ui-anti-ai-slop-redesign-prompt.txt',
        'marketing/nextjs-marketing-page-de-templatization-prompt.txt',
        'docs/docs-sync-and-accuracy-prompt.txt',
        'engineering/dx-workflow-and-pr-review-prompt.txt'
    ];
}

module.exports = {
    getPrompt,
    listPrompts,
    getRunOrder,
    PROMPTS_DIR
};
