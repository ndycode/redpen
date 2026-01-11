/**
 * redpen - Production-grade audit prompts for AI-assisted codebases
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PROMPTS_DIR = path.join(__dirname, 'prompts');

const DEFAULTS = {
    frontend: 'nextjs',
    backend: 'supabase',
    mobile: 'responsive'
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG DIRECTORY (XDG-compliant, per-platform)
// ═══════════════════════════════════════════════════════════════════════════════
function getConfigDir() {
    const home = os.homedir();
    let baseDir;
    
    switch (process.platform) {
        case 'win32':
            baseDir = path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'redpen');
            break;
        case 'darwin':
            baseDir = path.join(home, 'Library', 'Application Support', 'redpen');
            break;
        default: // linux, etc
            baseDir = path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'redpen');
            break;
    }
    
    return baseDir;
}

function getProjectHash() {
    // Use git remote URL as unique identifier, fallback to cwd
    try {
        const remote = execSync('git config --get remote.origin.url', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        return crypto.createHash('md5').update(remote).digest('hex').slice(0, 12);
    } catch {
        return crypto.createHash('md5').update(process.cwd()).digest('hex').slice(0, 12);
    }
}

function getProjectConfigDir() {
    const dir = path.join(getConfigDir(), 'projects', getProjectHash());
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getConfigFile() {
    return path.join(getProjectConfigDir(), 'config.json');
}

function getConfig() {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
        return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
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
