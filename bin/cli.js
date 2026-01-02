#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const CONFIG_FILE = path.join(process.cwd(), '.redpenrc');
const CUSTOM_DIR = path.join(process.cwd(), '.redpen');

// Colors
const c = {
    green: s => `\x1b[32m${s}\x1b[0m`,
    yellow: s => `\x1b[33m${s}\x1b[0m`,
    dim: s => `\x1b[2m${s}\x1b[0m`,
    reset: '\x1b[0m'
};

const DEFAULTS = {
    platform: 'web',
    frontend: 'nextjs',
    backend: 'supabase'
};

function getBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
        return null;
    }
}

function getProgressFile() {
    const branch = getBranch();
    if (branch) {
        return path.join(process.cwd(), `.redpen-progress-${branch.replace(/[^a-zA-Z0-9-]/g, '-')}.json`);
    }
    return path.join(process.cwd(), '.redpen-progress.json');
}

function getConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
    return null;
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isFile() && file.endsWith('.txt')) {
            files.push(fullPath);
        }
    });
    return files.sort();
}

function scanDirRecursive(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && file !== 'workflow') {
            scanDirRecursive(fullPath).forEach(f => files.push(f));
        } else if (stat.isFile() && file.endsWith('.txt')) {
            files.push(fullPath);
        }
    });
    return files.sort();
}

function buildRunOrder(config) {
    const prompts = [];

    // Core (always included)
    ['security', 'quality', 'architecture', 'process'].forEach(category => {
        scanDir(path.join(PROMPTS_DIR, 'core', category)).forEach(f => prompts.push(f));
    });

    if (config.platform === 'mobile') {
        // Mobile platform - core always, then framework-specific
        scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', 'core')).forEach(f => prompts.push(f));
        if (config.framework && config.framework !== 'none') {
            scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', config.framework)).forEach(f => prompts.push(f));
        }
    } else {
        // Web platform (default)
        if (config.frontend && config.frontend !== 'none') {
            scanDir(path.join(PROMPTS_DIR, 'web', 'frontend', config.frontend)).forEach(f => prompts.push(f));
            scanDir(path.join(PROMPTS_DIR, 'web', 'interface')).forEach(f => prompts.push(f));
        }
        if (config.backend && config.backend !== 'none') {
            scanDir(path.join(PROMPTS_DIR, 'web', 'backend', config.backend)).forEach(f => prompts.push(f));
        }
        scanDir(path.join(PROMPTS_DIR, 'web', 'product')).forEach(f => prompts.push(f));
        scanDir(path.join(PROMPTS_DIR, 'web', 'growth')).forEach(f => prompts.push(f));
    }

    // Custom prompts (from .redpen/ in project root)
    if (fs.existsSync(CUSTOM_DIR)) {
        scanDirRecursive(CUSTOM_DIR).forEach(f => {
            prompts.push(f);
        });
    }

    return prompts.map(p => {
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

function getProgress() {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        return JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    }
    return { completed: [] };
}

function saveProgress(progress) {
    fs.writeFileSync(getProgressFile(), JSON.stringify(progress, null, 2));
}

function getPromptName(filename) {
    return filename.replace('.txt', '');
}

function findPromptFile(name, runOrder) {
    const exactMatch = runOrder.find(p => p === name || p === `${name}.txt` || p.endsWith(`/${name}.txt`));
    if (exactMatch) return exactMatch;

    const partialMatch = runOrder.find(p => p.includes(name));
    if (partialMatch) return partialMatch;

    return null;
}

function findPromptByNumber(num, runOrder) {
    const index = parseInt(num, 10) - 1;
    if (index >= 0 && index < runOrder.length) {
        return runOrder[index];
    }
    return null;
}

function resolvePrompt(arg, runOrder) {
    // Try numeric first
    if (/^\d+$/.test(arg)) {
        return findPromptByNumber(arg, runOrder);
    }
    // Then name-based
    return findPromptFile(arg, runOrder);
}

function detectStack() {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pubspecPath = path.join(process.cwd(), 'pubspec.yaml');

    // Check for Flutter (pubspec.yaml)
    if (fs.existsSync(pubspecPath)) {
        return { platform: 'mobile' };
    }

    if (!fs.existsSync(pkgPath)) return DEFAULTS;

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Check for React Native
        if (deps['react-native']) {
            return { platform: 'mobile' };
        }

        const detected = {
            platform: 'web',
            frontend: 'none',
            backend: 'none'
        };

        // Frontend
        if (deps['next']) detected.frontend = 'nextjs';
        else if (deps['react']) detected.frontend = 'react';
        else if (deps['vue']) detected.frontend = 'vue';

        // Backend
        if (deps['@supabase/supabase-js']) detected.backend = 'supabase';
        else if (deps['firebase']) detected.backend = 'firebase';
        else if (deps['@prisma/client']) detected.backend = 'prisma';

        return detected;
    } catch {
        return DEFAULTS;
    }
}

function getVersion() {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
}

async function interactiveSelect(action) {
    const { default: inquirer } = await import('inquirer');
    const Separator = inquirer.Separator;
    const progress = getProgress();
    const runOrder = getRunOrder();

    const categories = {};
    runOrder.forEach((prompt, index) => {
        const parts = prompt.split('/');
        let category;
        if (parts[0] === 'core') {
            category = parts[1];
        } else if (parts[0] === 'web') {
            category = parts[1];
        } else if (parts[0] === 'mobile') {
            category = parts.length > 2 ? parts[1] : 'mobile';
        } else {
            category = parts[0];
        }
        if (!categories[category]) categories[category] = [];
        categories[category].push({ prompt, index });
    });

    const choices = [];
    const categoryOrder = ['security', 'architecture', 'quality', 'process', 'frontend', 'backend', 'interface', 'product', 'growth', 'mobile', 'ui'];

    categoryOrder.forEach(category => {
        if (categories[category]) {
            choices.push(new Separator(`\n${category}`));
            categories[category].forEach(({ prompt, index }) => {
                const done = progress.completed.includes(prompt);
                const mark = done ? 'x' : ' ';
                const name = prompt.replace('.txt', '');
                choices.push({
                    name: `[${mark}] ${String(index + 1).padStart(2)}  ${name}`,
                    value: prompt,
                    short: name
                });
            });
        }
    });

    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message: action,
            choices,
            loop: false,
            pageSize: 20
        }
    ]);

    return selected;
}


function showPrompt(promptFile) {
    const fullPath = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`not found: ${promptFile}`);
        process.exit(1);
    }
    console.log(fs.readFileSync(fullPath, 'utf-8'));
}

function copyPrompt(promptFile) {
    const fullPath = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`not found: ${promptFile}`);
        process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');

    try {
        require('child_process').execSync(
            process.platform === 'win32' ? 'clip' : 'pbcopy',
            { input: content }
        );
        console.log(`copied: ${promptFile}`);
    } catch {
        console.log(content);
    }
}

function showOrder(tagFilter) {
    const progress = getProgress();
    const runOrder = getRunOrder();
    let currentCategory = '';
    const next = runOrder.find(p => !progress.completed.includes(p));

    runOrder.forEach((prompt, i) => {
        const parts = prompt.split('/');
        let category;
        if (parts[0] === 'core') {
            category = parts[1];
        } else if (parts[0] === 'web') {
            category = parts[1];
        } else if (parts[0] === 'mobile') {
            category = parts.length > 2 ? parts[1] : 'mobile';
        } else {
            category = parts[0];
        }

        // Tag filter
        if (tagFilter && category !== tagFilter) return;

        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category.toUpperCase()}`);
        }
        const done = progress.completed.includes(prompt);
        const isNext = prompt === next;
        const mark = done ? 'x' : ' ';
        const name = prompt.replace('.txt', '');
        const num = String(i + 1).padStart(2);

        let line = `  [${mark}] ${num}  ${name}`;
        if (done) {
            line = c.green(line);
        } else if (isNext) {
            line = c.yellow(line);
        } else {
            line = c.dim(line);
        }
        console.log(line);
    });
    console.log('');
}

function showNext() {
    const progress = getProgress();
    const runOrder = getRunOrder();
    const next = runOrder.find(p => !progress.completed.includes(p));

    if (!next) {
        console.log('done');
        return;
    }

    const index = runOrder.indexOf(next) + 1;
    const name = next.replace('.txt', '');
    console.log(`${index}/${runOrder.length}  ${name}`);
}

function markDone(promptFile) {
    const progress = getProgress();
    const runOrder = getRunOrder();
    if (!progress.completed.includes(promptFile)) {
        progress.completed.push(promptFile);
        // Version tracking
        if (!progress.versions) progress.versions = {};
        progress.versions[promptFile] = getVersion();
        saveProgress(progress);
    }
    console.log(`done: ${promptFile.replace('.txt', '')}`);

    const next = runOrder.find(p => !progress.completed.includes(p));
    if (next) {
        const index = runOrder.indexOf(next) + 1;
        console.log(`next: ${index}/${runOrder.length}  ${next.replace('.txt', '')}`);
    }
}

function showStatus() {
    const progress = getProgress();
    const runOrder = getRunOrder();
    const total = runOrder.length;
    const done = progress.completed.length;

    console.log(`${done}/${total}`);

    if (done < total) {
        showNext();
    }
}

function showList() {
    const runOrder = getRunOrder();
    let currentCategory = '';
    runOrder.forEach((p, i) => {
        const parts = p.split('/');
        let category;
        if (parts[0] === 'core') {
            category = parts[1];
        } else if (parts[0] === 'web') {
            category = parts[1];
        } else if (parts[0] === 'mobile') {
            category = parts.length > 2 ? parts[1] : 'mobile';
        } else {
            category = parts[0];
        }
        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category}`);
        }
        console.log(`  ${String(i + 1).padStart(2)}  ${p.replace('.txt', '')}`);
    });
    console.log('');
}

function skip(promptFile) {
    const progress = getProgress();
    if (!progress.skipped) progress.skipped = [];
    if (!progress.skipped.includes(promptFile)) {
        progress.skipped.push(promptFile);
        saveProgress(progress);
    }
    console.log(`skipped: ${promptFile.replace('.txt', '')}`);
    showNext();
}

function undo() {
    const progress = getProgress();
    if (progress.completed.length === 0) {
        console.log('nothing to undo');
        return;
    }
    const last = progress.completed.pop();
    if (progress.versions) delete progress.versions[last];
    saveProgress(progress);
    console.log(`undone: ${last.replace('.txt', '')}`);
}

async function run() {
    const progress = getProgress();
    const runOrder = getRunOrder();
    const next = runOrder.find(p => !progress.completed.includes(p));

    if (!next) {
        console.log('all prompts complete');
        return;
    }

    // Copy to clipboard
    const fullPath = path.join(PROMPTS_DIR, next);
    const content = fs.readFileSync(fullPath, 'utf-8');
    try {
        require('child_process').execSync(
            process.platform === 'win32' ? 'clip' : 'pbcopy',
            { input: content }
        );
    } catch { }

    const index = runOrder.indexOf(next) + 1;
    console.log(`\ncopied: ${next.replace('.txt', '')} (${index}/${runOrder.length})`);
    console.log('\n→ Paste in your AI editor, run audit, fix issues');
    console.log('→ Press Enter when complete...\n');

    const { default: inquirer } = await import('inquirer');
    await inquirer.prompt([{ type: 'input', name: 'confirm', message: '' }]);

    markDone(next);
}

function check(required) {
    const progress = getProgress();
    const runOrder = getRunOrder();

    let categories = [];
    if (required) {
        categories = required.split(',').map(c => c.trim().toLowerCase());
    }

    const missing = [];
    runOrder.forEach(p => {
        if (!progress.completed.includes(p)) {
            if (categories.length === 0) {
                missing.push(p);
            } else {
                const parts = p.split('/');
                const cat = parts[0] === 'core' ? parts[1] : parts[0];
                if (categories.includes(cat)) {
                    missing.push(p);
                }
            }
        }
    });

    if (missing.length === 0) {
        console.log('all required prompts complete');
        process.exit(0);
    } else {
        console.log(`missing ${missing.length} required prompt(s):`);
        missing.forEach(m => console.log(`  ${m.replace('.txt', '')}`));
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
redpen <command> [name|number]

  init           select platform (web/mobile)
  run            copy next → wait → mark done
  
  next           what to run
  order [tag]    full sequence (filter by category)
  status         progress
  list           all prompts

  show [n]       print prompt
  copy [n]       copy to clipboard
  done [n]       mark complete
  skip [n]       skip prompt
  undo           undo last done

  check [cats]   CI: fail if incomplete
  report         markdown audit summary
  doctor         validate config
  completion     output shell completion script
  reset          clear progress
  --version      show version

Use numbers: redpen copy 3
Custom prompts: add to .redpen/ folder
Progress tracked per git branch
`);
}

function completion() {
    const script = `
# redpen shell completion
_redpen() {
    local commands="init run order next status list show copy done skip undo check report doctor completion reset help"
    local categories="security quality architecture process frontend interface product growth mobile"
    
    case "\${COMP_WORDS[1]}" in
        order|check)
            COMPREPLY=( $(compgen -W "$categories" -- "\${COMP_WORDS[2]}") )
            ;;
        *)
            COMPREPLY=( $(compgen -W "$commands" -- "\${COMP_WORDS[1]}") )
            ;;
    esac
}
complete -F _redpen redpen

# For zsh, add: autoload -U compinit && compinit
`;
    console.log(script);
}

async function init() {
    const { default: inquirer } = await import('inquirer');
    const detected = detectStack();

    console.log(`detected: ${detected.platform}`);

    const { platform } = await inquirer.prompt([
        {
            type: 'list',
            name: 'platform',
            message: 'platform',
            default: detected.platform,
            choices: ['web', 'mobile']
        }
    ]);

    let config = { platform };

    if (platform === 'web') {
        const webAnswers = await inquirer.prompt([
            {
                type: 'list',
                name: 'frontend',
                message: 'frontend',
                default: detected.frontend || 'nextjs',
                choices: ['nextjs', 'react', 'vue', 'none']
            },
            {
                type: 'list',
                name: 'backend',
                message: 'backend',
                default: detected.backend || 'supabase',
                choices: ['supabase', 'firebase', 'prisma', 'none']
            }
        ]);
        config = { ...config, ...webAnswers };
    } else {
        const mobileAnswers = await inquirer.prompt([
            {
                type: 'list',
                name: 'framework',
                message: 'framework',
                default: 'flutter',
                choices: ['flutter', 'react-native', 'native', 'none']
            }
        ]);
        config = { ...config, ...mobileAnswers };
    }

    saveConfig(config);
    const runOrder = getRunOrder();
    console.log(`\n${runOrder.length} prompts`);
}

function reset() {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
    }
    console.log('reset');
}

function report() {
    const progress = getProgress();
    const runOrder = getRunOrder();
    const config = getConfig() || DEFAULTS;

    let md = `# Audit Report\n\n`;
    md += `**Platform**: ${config.platform}\n`;
    md += `**Progress**: ${progress.completed.length}/${runOrder.length}\n`;
    md += `**Generated**: ${new Date().toISOString()}\n\n`;

    md += `## Completed\n\n`;
    if (progress.completed.length === 0) {
        md += `_None_\n`;
    } else {
        progress.completed.forEach(p => {
            const version = progress.versions?.[p] || 'unknown';
            md += `- [x] ${p.replace('.txt', '')} (v${version})\n`;
        });
    }

    md += `\n## Pending\n\n`;
    const pending = runOrder.filter(p => !progress.completed.includes(p));
    if (pending.length === 0) {
        md += `_All complete_\n`;
    } else {
        pending.forEach(p => {
            md += `- [ ] ${p.replace('.txt', '')}\n`;
        });
    }

    if (progress.skipped?.length > 0) {
        md += `\n## Skipped\n\n`;
        progress.skipped.forEach(p => {
            md += `- ${p.replace('.txt', '')}\n`;
        });
    }

    console.log(md);
}

function doctor() {
    let issues = 0;

    // Check config
    const config = getConfig();
    if (!config) {
        console.log('⚠ no .redpenrc found (run: redpen init)');
        issues++;
    } else {
        console.log(`✓ config: platform=${config.platform}`);
    }

    // Check prompts folder
    if (!fs.existsSync(PROMPTS_DIR)) {
        console.log('✗ prompts folder missing');
        issues++;
    } else {
        const runOrder = getRunOrder();
        console.log(`✓ prompts: ${runOrder.length} found`);
    }

    // Check progress file
    const progress = getProgress();
    console.log(`✓ progress: ${progress.completed.length} completed`);

    if (issues === 0) {
        console.log('\nall checks passed');
    } else {
        console.log(`\n${issues} issue(s) found`);
        process.exit(1);
    }
}

// CLI Entry
const args = process.argv.slice(2);
const command = args[0];
const arg = args[1];

(async () => {
    const runOrder = getRunOrder();

    switch (command) {
        case 'init':
            await init();
            break;
        case 'run':
            await run();
            break;
        case 'order':
            showOrder(arg);
            break;
        case 'next':
            showNext();
            break;
        case 'status':
            showStatus();
            break;
        case 'list':
            showList();
            break;
        case 'show': {
            let showFile;
            if (!arg) {
                showFile = await interactiveSelect('show');
            } else {
                showFile = resolvePrompt(arg, runOrder);
                if (!showFile) {
                    console.error(`not found: ${arg}`);
                    process.exit(1);
                }
            }
            showPrompt(showFile);
            break;
        }
        case 'copy': {
            let copyFile;
            if (!arg) {
                copyFile = await interactiveSelect('copy');
            } else {
                copyFile = resolvePrompt(arg, runOrder);
                if (!copyFile) {
                    console.error(`not found: ${arg}`);
                    process.exit(1);
                }
            }
            copyPrompt(copyFile);
            break;
        }
        case 'done': {
            let doneFile;
            if (!arg) {
                doneFile = await interactiveSelect('done');
            } else {
                doneFile = resolvePrompt(arg, runOrder);
                if (!doneFile) {
                    console.error(`not found: ${arg}`);
                    process.exit(1);
                }
            }
            markDone(doneFile);
            break;
        }
        case 'skip': {
            let skipFile;
            if (!arg) {
                skipFile = await interactiveSelect('skip');
            } else {
                skipFile = resolvePrompt(arg, runOrder);
                if (!skipFile) {
                    console.error(`not found: ${arg}`);
                    process.exit(1);
                }
            }
            skip(skipFile);
            break;
        }
        case 'undo':
            undo();
            break;
        case 'check':
            check(arg);
            break;
        case 'report':
            report();
            break;
        case 'doctor':
            doctor();
            break;
        case 'completion':
            completion();
            break;
        case 'reset':
            reset();
            break;
        case '--version':
        case '-v':
            console.log(getVersion());
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            if (command) {
                console.error(`unknown: ${command}`);
            }
            showHelp();
    }
})();

