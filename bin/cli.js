#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const PROGRESS_FILE = path.join(process.cwd(), '.redpen-progress.json');

const RUN_ORDER = [
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

function getProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
    return { completed: [] };
}

function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function getPromptName(filename) {
    return filename.replace('-prompt.txt', '').replace(/\//g, '/');
}

function findPromptFile(name) {
    // Try exact match
    const exactMatch = RUN_ORDER.find(p => p === name || p === `${name}-prompt.txt`);
    if (exactMatch) return exactMatch;

    // Try partial match
    const partialMatch = RUN_ORDER.find(p => p.includes(name));
    if (partialMatch) return partialMatch;

    return null;
}

async function interactiveSelect(action) {
    const { default: inquirer } = await import('inquirer');
    const Separator = inquirer.Separator;
    const progress = getProgress();

    // Group prompts by category
    const categories = {};
    RUN_ORDER.forEach((prompt, index) => {
        const category = prompt.split('/')[0].toUpperCase();
        if (!categories[category]) categories[category] = [];
        categories[category].push({ prompt, index });
    });

    // Build choices with category headers
    const choices = [];
    const categoryOrder = ['SECURITY', 'ARCHITECTURE', 'QUALITY', 'INTERFACE', 'PRODUCT', 'GROWTH', 'PROCESS'];

    categoryOrder.forEach(category => {
        if (categories[category]) {
            choices.push(new Separator(`\n── ${category} ──────────────────────`));
            categories[category].forEach(({ prompt, index }) => {
                const done = progress.completed.includes(prompt);
                const status = done ? '✓' : '○';
                const name = prompt.replace('.txt', '');
                choices.push({
                    name: `  ${status} ${String(index + 1).padStart(2)}. ${name}`,
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
            message: `Select a prompt to ${action}:`,
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

function showOrder() {
    const progress = getProgress();
    let currentCategory = '';

    RUN_ORDER.forEach((prompt, i) => {
        const category = prompt.split('/')[0];
        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category.toUpperCase()}`);
        }
        const done = progress.completed.includes(prompt);
        const mark = done ? 'x' : ' ';
        const name = prompt.replace('.txt', '');
        console.log(`  [${mark}] ${String(i + 1).padStart(2)}  ${name}`);
    });
    console.log('');
}

function showNext() {
    const progress = getProgress();
    const next = RUN_ORDER.find(p => !progress.completed.includes(p));

    if (!next) {
        console.log('done');
        return;
    }

    const index = RUN_ORDER.indexOf(next) + 1;
    const name = next.replace('.txt', '');
    console.log(`${index}/${RUN_ORDER.length}  ${name}`);
}

function markDone(promptFile) {
    const progress = getProgress();
    if (!progress.completed.includes(promptFile)) {
        progress.completed.push(promptFile);
        saveProgress(progress);
    }
    console.log(`done: ${promptFile.replace('.txt', '')}`);

    const next = RUN_ORDER.find(p => !progress.completed.includes(p));
    if (next) {
        const index = RUN_ORDER.indexOf(next) + 1;
        console.log(`next: ${index}/${RUN_ORDER.length}  ${next.replace('.txt', '')}`);
    }
}

function showStatus() {
    const progress = getProgress();
    const total = RUN_ORDER.length;
    const done = progress.completed.length;

    console.log(`${done}/${total}`);

    if (done < total) {
        showNext();
    }
}

function showList() {
    let currentCategory = '';
    RUN_ORDER.forEach(p => {
        const category = p.split('/')[0];
        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category}`);
        }
        console.log(`  ${p.replace('.txt', '')}`);
    });
    console.log('');
}

function showHelp() {
    console.log(`
redpen <command> [name]

  next           what to run
  order          full sequence
  status         progress
  list           all prompts

  show [name]    print prompt
  copy [name]    copy to clipboard
  done [name]    mark complete

  reset          clear progress

Run without [name] for interactive selection.
`);
}

function reset() {
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
    console.log('reset');
}

// CLI Entry
const args = process.argv.slice(2);
const command = args[0];
const arg = args[1];

(async () => {
    switch (command) {
        case 'order':
            showOrder();
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
                showFile = findPromptFile(arg);
                if (!showFile) {
                    console.error(`Prompt not found: ${arg}`);
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
                copyFile = findPromptFile(arg);
                if (!copyFile) {
                    console.error(`Prompt not found: ${arg}`);
                    process.exit(1);
                }
            }
            copyPrompt(copyFile);
            break;
        }
        case 'done': {
            let doneFile;
            if (!arg) {
                doneFile = await interactiveSelect('mark as done');
            } else {
                doneFile = findPromptFile(arg);
                if (!doneFile) {
                    console.error(`Prompt not found: ${arg}`);
                    process.exit(1);
                }
            }
            markDone(doneFile);
            break;
        }
        case 'reset':
            reset();
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            if (command) {
                console.error(`Unknown command: ${command}`);
            }
            showHelp();
    }
})();

