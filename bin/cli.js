#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..');
const PROGRESS_FILE = path.join(process.cwd(), '.redpen-progress.json');

const RUN_ORDER = [
    'analysis-prompt.txt',
    'auth-data-safety-prompt.txt',
    'data-consistency-prompt.txt',
    'invariant-prompt.txt',
    'blast-radius-prompt.txt',
    'human-error-prompt.txt',
    'nextjs-rendering-prompt.txt',
    'operability-prompt.txt',
    'optimization-prompt.txt',
    'test-generation-prompt.txt',
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
    console.log('System Safety → Framework → Tests → UI → Content → Mobile → Failure → Marketing → Hygiene\n');

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
