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

function showPrompt(promptFile) {
    const fullPath = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`Prompt not found: ${promptFile}`);
        process.exit(1);
    }
    console.log(fs.readFileSync(fullPath, 'utf-8'));
}

function copyPrompt(promptFile) {
    const fullPath = path.join(PROMPTS_DIR, promptFile);
    if (!fs.existsSync(fullPath)) {
        console.error(`Prompt not found: ${promptFile}`);
        process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Try to copy to clipboard
    try {
        require('child_process').execSync(
            process.platform === 'win32' ? 'clip' : 'pbcopy',
            { input: content }
        );
        console.log(`✓ Copied ${promptFile} to clipboard`);
    } catch {
        console.log('Could not copy to clipboard. Content:');
        console.log(content);
    }
}

function showOrder() {
    console.log('\n📋 REDPEN Canonical Run Order\n');
    console.log('Security → Architecture → Quality → Interface → Product → Growth → Process\n');

    const progress = getProgress();

    RUN_ORDER.forEach((prompt, i) => {
        const done = progress.completed.includes(prompt);
        const status = done ? '✓' : ' ';
        console.log(`[${status}] ${String(i + 1).padStart(2)}. ${prompt}`);
    });
    console.log('');
}

function showNext() {
    const progress = getProgress();
    const next = RUN_ORDER.find(p => !progress.completed.includes(p));

    if (!next) {
        console.log('✓ All prompts completed!');
        return;
    }

    const index = RUN_ORDER.indexOf(next) + 1;
    console.log(`\n📍 Next: [${index}/${RUN_ORDER.length}] ${next}\n`);
    console.log('Run: redpen show ' + getPromptName(next));
    console.log('Or:  redpen copy ' + getPromptName(next));
}

function markDone(promptFile) {
    const progress = getProgress();
    if (!progress.completed.includes(promptFile)) {
        progress.completed.push(promptFile);
        saveProgress(progress);
    }
    console.log(`✓ Marked ${promptFile} as complete`);
    showNext();
}

function showStatus() {
    const progress = getProgress();
    const total = RUN_ORDER.length;
    const done = progress.completed.length;
    const pct = Math.round((done / total) * 100);

    console.log(`\n📊 REDPEN Status\n`);
    console.log(`Progress: ${done}/${total} (${pct}%)`);
    console.log(`${'█'.repeat(Math.round(pct / 5))}${'░'.repeat(20 - Math.round(pct / 5))}`);

    if (done < total) {
        showNext();
    } else {
        console.log('\n✓ All prompts completed! Ship it! 🚀\n');
    }
}

function showList() {
    console.log('\n📚 Available Prompts\n');
    RUN_ORDER.forEach(p => console.log(`  ${getPromptName(p)}`));
    console.log('');
}

function showHelp() {
    console.log(`
redpen - Senior engineer review system in a box

USAGE
  redpen <command> [options]

COMMANDS
  order          Show canonical run order with progress
  next           Show next prompt to run
  status         Show overall progress
  list           List all available prompts
  
  show <name>    Display prompt content
  copy <name>    Copy prompt to clipboard
  done <name>    Mark prompt as complete
  
  reset          Reset all progress

EXAMPLES
  redpen order
  redpen show auth-data-safety
  redpen copy ui/design-tokens-enforcement
  redpen done analysis

WORKFLOW
  1. Run 'redpen next' to see the next prompt
  2. Run 'redpen copy <name>' to copy it
  3. Paste into Claude/ChatGPT/Cursor
  4. Address CRITICAL and HIGH findings
  5. Run 'redpen done <name>' to mark complete
  6. Repeat until all prompts pass

MORE INFO
  https://github.com/ndycode/redpen
`);
}

function reset() {
    if (fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE);
    }
    console.log('✓ Progress reset');
}

// CLI Entry
const args = process.argv.slice(2);
const command = args[0];
const arg = args[1];

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
    case 'show':
        if (!arg) {
            console.error('Usage: redpen show <prompt-name>');
            process.exit(1);
        }
        const showFile = findPromptFile(arg);
        if (!showFile) {
            console.error(`Prompt not found: ${arg}`);
            process.exit(1);
        }
        showPrompt(showFile);
        break;
    case 'copy':
        if (!arg) {
            console.error('Usage: redpen copy <prompt-name>');
            process.exit(1);
        }
        const copyFile = findPromptFile(arg);
        if (!copyFile) {
            console.error(`Prompt not found: ${arg}`);
            process.exit(1);
        }
        copyPrompt(copyFile);
        break;
    case 'done':
        if (!arg) {
            console.error('Usage: redpen done <prompt-name>');
            process.exit(1);
        }
        const doneFile = findPromptFile(arg);
        if (!doneFile) {
            console.error(`Prompt not found: ${arg}`);
            process.exit(1);
        }
        markDone(doneFile);
        break;
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
