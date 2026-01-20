const fs = require('fs');
const path = require('path');
const { getConfig, DEFAULTS } = require('./config');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const CUSTOM_DIR = path.join(process.cwd(), '.redpen');

function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => fs.statSync(path.join(dir, f)).isFile() && f.endsWith('.txt'))
        .map((f) => path.join(dir, f))
        .sort();
}

function scanDirRecursive(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    fs.readdirSync(dir).forEach((f) => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory() && f !== 'workflow') {
            files.push(...scanDirRecursive(full));
        } else if (stat.isFile() && f.endsWith('.txt')) {
            files.push(full);
        }
    });
    return files.sort();
}

function buildRunOrder(config) {
    const prompts = [];

    ['security', 'quality', 'architecture', 'process'].forEach((category) => {
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'core', category)));
    });

    if (config.platform === 'mobile') {
        prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', 'core')));
        if (config.framework && config.framework !== 'none') {
            prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', config.framework)));
        }
    } else {
        if (config.frontend && config.frontend !== 'none') {
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'frontend', config.frontend)));
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'interface')));
        }
        if (config.backend && config.backend !== 'none') {
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'backend', config.backend)));
        }
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'product')));
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'growth')));
    }

    if (fs.existsSync(CUSTOM_DIR)) {
        prompts.push(...scanDirRecursive(CUSTOM_DIR));
    }

    return prompts.map((p) => {
        if (p.startsWith(CUSTOM_DIR)) {
            return 'custom/' + path.relative(CUSTOM_DIR, p).replace(/\\/g, '/');
        }
        return path.relative(PROMPTS_DIR, p).replace(/\\/g, '/');
    });
}

function getRunOrder() {
    const config = getConfig() || DEFAULTS;
    return buildRunOrder(config);
}

function getPromptContent(promptPath) {
    const fullPath = promptPath.startsWith('custom/')
        ? path.join(CUSTOM_DIR, promptPath.replace('custom/', ''))
        : path.join(PROMPTS_DIR, promptPath);

    if (!fs.existsSync(fullPath)) {
        return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
}

function getPromptFullPath(promptPath) {
    if (promptPath.startsWith('custom/')) {
        return path.join(CUSTOM_DIR, promptPath.replace('custom/', ''));
    }
    return path.join(PROMPTS_DIR, promptPath);
}

function resolvePrompt(arg, runOrder) {
    if (/^\d+$/.test(arg)) {
        const index = parseInt(arg, 10) - 1;
        if (index >= 0 && index < runOrder.length) {
            return runOrder[index];
        }
        return null;
    }

    const exactMatch = runOrder.find((p) => p === arg || p === `${arg}.txt` || p.endsWith(`/${arg}.txt`));
    if (exactMatch) return exactMatch;

    const partialMatch = runOrder.find((p) => p.includes(arg));
    return partialMatch || null;
}

function getPromptName(promptPath) {
    return promptPath.replace('.txt', '');
}

function getPromptCategory(promptPath) {
    const parts = promptPath.split('/');
    if (parts[0] === 'core') return parts[1];
    if (parts[0] === 'web') return parts[1];
    if (parts[0] === 'mobile') return parts.length > 2 ? parts[1] : 'mobile';
    return parts[0];
}

module.exports = {
    PROMPTS_DIR,
    CUSTOM_DIR,
    scanDir,
    scanDirRecursive,
    buildRunOrder,
    getRunOrder,
    getPromptContent,
    getPromptFullPath,
    resolvePrompt,
    getPromptName,
    getPromptCategory,
};
