/**
 * redpen - Production-grade audit prompts for AI-assisted codebases
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, 'prompts');
const CONFIG_FILE = path.join(process.cwd(), '.redpenrc');

const DEFAULTS = {
    frontend: 'nextjs',
    backend: 'supabase',
    mobile: 'responsive'
};

function getConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return null;
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.txt'))
        .map(f => path.join(dir, f))
        .sort();
}

function buildRunOrder(config) {
    const prompts = [];

    ['security', 'quality', 'architecture', 'process'].forEach(cat => {
        scanDir(path.join(PROMPTS_DIR, 'core', cat)).forEach(f => prompts.push(f));
    });

    if (config.frontend && config.frontend !== 'none') {
        scanDir(path.join(PROMPTS_DIR, 'frontend', config.frontend)).forEach(f => prompts.push(f));
    }

    if (config.backend && config.backend !== 'none') {
        scanDir(path.join(PROMPTS_DIR, 'backend', config.backend)).forEach(f => prompts.push(f));
    }

    if (config.frontend && config.frontend !== 'none') {
        scanDir(path.join(PROMPTS_DIR, 'interface')).forEach(f => prompts.push(f));
    }

    scanDir(path.join(PROMPTS_DIR, 'product')).forEach(f => prompts.push(f));
    scanDir(path.join(PROMPTS_DIR, 'growth')).forEach(f => prompts.push(f));

    if (config.mobile && config.mobile !== 'none') {
        scanDir(path.join(PROMPTS_DIR, 'mobile', config.mobile)).forEach(f => prompts.push(f));
    }

    return prompts.map(p => path.relative(PROMPTS_DIR, p).replace(/\\/g, '/'));
}

/**
 * Get dynamic run order based on config
 * @returns {string[]} Array of prompt paths
 */
function getRunOrder() {
    const config = getConfig() || DEFAULTS;
    return buildRunOrder(config);
}

/**
 * Get prompt content by path
 * @param {string} promptPath - Prompt path (e.g., 'core/security/code-analysis.txt')
 * @returns {string} Prompt content
 */
function getPrompt(promptPath) {
    const fullPath = path.join(PROMPTS_DIR, promptPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Prompt not found: ${promptPath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * List all available prompts
 * @returns {string[]} Array of prompt paths
 */
function listPrompts() {
    return getRunOrder();
}

module.exports = {
    getPrompt,
    listPrompts,
    getRunOrder,
    getConfig,
    PROMPTS_DIR,
    DEFAULTS
};
