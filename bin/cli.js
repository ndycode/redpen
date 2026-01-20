#!/usr/bin/env node

const fs = require('fs');

const lib = require('../lib');

const c = lib.colors;

function showPrompt(promptFile) {
    const content = lib.getPromptContent(promptFile);
    if (!content) {
        console.error(`not found: ${promptFile}`);
        process.exit(1);
    }
    console.log(content);
}

function copyPrompt(promptFile) {
    const content = lib.getPromptContent(promptFile);
    if (!content) {
        console.error(`not found: ${promptFile}`);
        process.exit(1);
    }

    if (lib.copyToClipboard(content)) {
        console.log(`copied: ${promptFile}`);
    } else {
        console.log(content);
    }
}

function showOrder(tagFilter) {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    let currentCategory = '';
    const next = runOrder.find((p) => !progress.completed.includes(p));

    runOrder.forEach((prompt, i) => {
        const category = lib.getPromptCategory(prompt);

        if (tagFilter && category !== tagFilter) return;

        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category.toUpperCase()}`);
        }
        const done = progress.completed.includes(prompt);
        const isNext = prompt === next;
        const mark = done ? 'x' : ' ';
        const name = lib.getPromptName(prompt);
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
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const next = runOrder.find((p) => !progress.completed.includes(p));

    if (!next) {
        console.log('done');
        return;
    }

    const index = runOrder.indexOf(next) + 1;
    const name = lib.getPromptName(next);
    console.log(`${index}/${runOrder.length}  ${name}`);
}

function markDone(promptFile) {
    lib.markDone(promptFile);
    console.log(`done: ${lib.getPromptName(promptFile)}`);

    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const next = runOrder.find((p) => !progress.completed.includes(p));
    if (next) {
        const index = runOrder.indexOf(next) + 1;
        console.log(`next: ${index}/${runOrder.length}  ${lib.getPromptName(next)}`);
    }
}

function showStatus() {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const total = runOrder.length;
    const done = progress.completed.length;

    console.log(`${done}/${total}`);

    if (done < total) {
        showNext();
    }
}

function showList() {
    const runOrder = lib.getRunOrder();
    let currentCategory = '';
    runOrder.forEach((p, i) => {
        const category = lib.getPromptCategory(p);
        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category}`);
        }
        console.log(`  ${String(i + 1).padStart(2)}  ${lib.getPromptName(p)}`);
    });
    console.log('');
}

function skip(promptFile) {
    lib.markSkipped(promptFile);
    console.log(`skipped: ${lib.getPromptName(promptFile)}`);
    showNext();
}

function undo() {
    const last = lib.undoLast();
    if (!last) {
        console.log('nothing to undo');
        return;
    }
    console.log(`undone: ${lib.getPromptName(last)}`);
}

async function run() {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const next = runOrder.find((p) => !progress.completed.includes(p));

    if (!next) {
        console.log('all prompts complete');
        return;
    }

    const content = lib.getPromptContent(next);
    lib.copyToClipboard(content);

    const index = runOrder.indexOf(next) + 1;
    console.log(`\ncopied: ${lib.getPromptName(next)} (${index}/${runOrder.length})`);
    console.log('\n→ Paste in your AI editor, run audit, fix issues');
    console.log('→ Press Enter when complete...\n');

    await lib.pressEnter('');

    markDone(next);
}

function check(required) {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();

    let categories = [];
    if (required) {
        categories = required.split(',').map((c) => c.trim().toLowerCase());
    }

    const missing = [];
    runOrder.forEach((p) => {
        if (!progress.completed.includes(p)) {
            if (categories.length === 0) {
                missing.push(p);
            } else {
                const cat = lib.getPromptCategory(p);
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
        missing.forEach((m) => console.log(`  ${lib.getPromptName(m)}`));
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
redpen <command> [name|number]

  ${c.yellow('interactive')}    ${c.dim('launch interactive TUI mode')}
  
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

${c.dim('Interactive Mode:')}
  redpen interactive    ${c.dim('or')} redpen i
  ${c.dim('/ - command palette, arrow keys to navigate')}
  ${c.dim('1-9 quick copy, r=run, c=copy, d=done, q=quit')}

${c.dim('Other:')}
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
    const detected = lib.detectStack();

    console.log(`detected: ${detected.platform}`);

    const platform = await lib.select({
        message: 'platform',
        choices: [
            { name: 'web', value: 'web' },
            { name: 'mobile', value: 'mobile' },
        ],
        default: detected.platform,
    });

    let config = { platform };

    if (platform === 'web') {
        const frontend = await lib.select({
            message: 'frontend',
            choices: [
                { name: 'nextjs', value: 'nextjs' },
                { name: 'react', value: 'react' },
                { name: 'vue', value: 'vue' },
                { name: 'none', value: 'none' },
            ],
            default: detected.frontend || 'nextjs',
        });

        const backend = await lib.select({
            message: 'backend',
            choices: [
                { name: 'supabase', value: 'supabase' },
                { name: 'firebase', value: 'firebase' },
                { name: 'prisma', value: 'prisma' },
                { name: 'none', value: 'none' },
            ],
            default: detected.backend || 'supabase',
        });

        config = { ...config, frontend, backend };
    } else {
        const framework = await lib.select({
            message: 'framework',
            choices: [
                { name: 'flutter', value: 'flutter' },
                { name: 'react-native', value: 'react-native' },
                { name: 'native', value: 'native' },
                { name: 'none', value: 'none' },
            ],
            default: 'flutter',
        });

        config = { ...config, framework };
    }

    lib.saveConfig(config);
    const runOrder = lib.getRunOrder();
    console.log(`\n${runOrder.length} prompts`);
}

function reset() {
    lib.resetProgress();
    console.log('reset');
}

function report() {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const config = lib.getConfig() || lib.DEFAULTS;

    let md = '# Audit Report\n\n';
    md += `**Platform**: ${config.platform}\n`;
    md += `**Progress**: ${progress.completed.length}/${runOrder.length}\n`;
    md += `**Generated**: ${new Date().toISOString()}\n\n`;

    md += '## Completed\n\n';
    if (progress.completed.length === 0) {
        md += '_None_\n';
    } else {
        progress.completed.forEach((p) => {
            const version = progress.versions?.[p] || 'unknown';
            md += `- [x] ${lib.getPromptName(p)} (v${version})\n`;
        });
    }

    md += '\n## Pending\n\n';
    const pending = runOrder.filter((p) => !progress.completed.includes(p));
    if (pending.length === 0) {
        md += '_All complete_\n';
    } else {
        pending.forEach((p) => {
            md += `- [ ] ${lib.getPromptName(p)}\n`;
        });
    }

    if (progress.skipped?.length > 0) {
        md += '\n## Skipped\n\n';
        progress.skipped.forEach((p) => {
            md += `- ${lib.getPromptName(p)}\n`;
        });
    }

    console.log(md);
}

function doctor() {
    let issues = 0;

    const config = lib.getConfig();
    const configFile = lib.getConfigFile();
    if (!config) {
        console.log(`⚠ no config found at ${configFile} (run: redpen init)`);
        issues++;
    } else {
        console.log(`✓ config: platform=${config.platform}`);
        console.log(`  location: ${configFile}`);
    }

    if (!fs.existsSync(lib.PROMPTS_DIR)) {
        console.log('✗ prompts folder missing');
        issues++;
    } else {
        const runOrder = lib.getRunOrder();
        console.log(`✓ prompts: ${runOrder.length} found`);
    }

    const progress = lib.getProgress();
    console.log(`✓ progress: ${progress.completed.length} completed`);

    if (issues === 0) {
        console.log('\nall checks passed');
    } else {
        console.log(`\n${issues} issue(s) found`);
        process.exit(1);
    }
}

async function interactiveSelect(action) {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();

    const categories = {};
    runOrder.forEach((prompt, index) => {
        const category = lib.getPromptCategory(prompt);
        if (!categories[category]) categories[category] = [];
        categories[category].push({ prompt, index });
    });

    const choices = [];
    const categoryOrder = [
        'security',
        'architecture',
        'quality',
        'process',
        'frontend',
        'backend',
        'interface',
        'product',
        'growth',
        'mobile',
        'ui',
    ];

    categoryOrder.forEach((category) => {
        if (categories[category]) {
            choices.push(lib.separator(`\n${category}`));
            categories[category].forEach(({ prompt, index }) => {
                const done = progress.completed.includes(prompt);
                const mark = done ? 'x' : ' ';
                const name = lib.getPromptName(prompt);
                choices.push({
                    name: `[${mark}] ${String(index + 1).padStart(2)}  ${name}`,
                    value: prompt,
                });
            });
        }
    });

    const selected = await lib.select({
        message: action,
        choices,
        pageSize: 20,
    });

    return selected;
}

const args = process.argv.slice(2);
const command = args[0];
const arg = args[1];

(async () => {
    const runOrder = lib.getRunOrder();

    switch (command) {
        case 'interactive':
        case 'i':
        case 'tui': {
            const { TUI } = require('./tui.js');
            const tui = new TUI();
            await tui.start();
            break;
        }
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
                showFile = lib.resolvePrompt(arg, runOrder);
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
                copyFile = lib.resolvePrompt(arg, runOrder);
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
                doneFile = lib.resolvePrompt(arg, runOrder);
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
                skipFile = lib.resolvePrompt(arg, runOrder);
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
            console.log(lib.getVersion());
            break;
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
        default:
            if (command) {
                console.error(`unknown: ${command}`);
                showHelp();
            } else {
                const { TUI } = require('./tui.js');
                const tui = new TUI();
                tui.start();
            }
    }
})();
