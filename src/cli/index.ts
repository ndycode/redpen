#!/usr/bin/env node

import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

import * as lib from '../lib/index.js';
import { doctor as runDoctor } from './doctor.js';
import { setup as runSetup } from './setup.js';
import { startTeam, shutdownTeam, getTeamState } from '../team/index.js';
import { AGENT_DEFINITIONS, getAgent } from '../agents/index.js';
import { listSkills } from '../skills/index.js';
import { renderHud, watchHudState } from '../hud/index.js';
import { getLoadedPlugins } from '../hooks/index.js';
import { generateAllConfigs } from '../agents/native-config.js';
import { getTeamDir } from '../state/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const c = lib.colors;

function showPrompt(promptFile: string) {
    const content = lib.getPromptContent(promptFile);
    if (!content) {
        console.error(`not found: ${promptFile}`);
        process.exit(1);
    }
    console.log(content);
}

function copyPrompt(promptFile: string) {
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

function showOrder(tagFilter?: string) {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    let currentCategory = '';
    const next = runOrder.find((p: string) => !progress.completed.includes(p));

    for (let i = 0; i < runOrder.length; i++) {
        const prompt = runOrder[i] as string;
        const category = lib.getPromptCategory(prompt);

        if (tagFilter && category !== tagFilter) continue;

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
    }
    console.log('');
}

function showNext() {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const next = runOrder.find((p: string) => !progress.completed.includes(p));

    if (!next) {
        console.log('done');
        return;
    }

    const index = runOrder.indexOf(next as string) + 1;
    const name = lib.getPromptName(next as string);
    console.log(`${index}/${runOrder.length}  ${name}`);
}

function markDoneFile(promptFile: string) {
    lib.markDone(promptFile);
    console.log(`done: ${lib.getPromptName(promptFile)}`);

    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const next = runOrder.find((p: string) => !progress.completed.includes(p));
    if (next) {
        const index = runOrder.indexOf(next as string) + 1;
        console.log(`next: ${index}/${runOrder.length}  ${lib.getPromptName(next as string)}`);
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
    for (let i = 0; i < runOrder.length; i++) {
        const p = runOrder[i] as string;
        const category = lib.getPromptCategory(p);
        if (category !== currentCategory) {
            currentCategory = category;
            console.log(`\n${category}`);
        }
        console.log(`  ${String(i + 1).padStart(2)}  ${lib.getPromptName(p)}`);
    }
    console.log('');
}

function skipCommand(promptFile: string) {
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
    const next = runOrder.find((p: string) => !progress.completed.includes(p));

    if (!next) {
        console.log('all prompts complete');
        return;
    }

    const content = lib.getPromptContent(next as string);
    if (content) {
        lib.copyToClipboard(content);
    }

    const index = runOrder.indexOf(next as string) + 1;
    console.log(`\ncopied: ${lib.getPromptName(next as string)} (${index}/${runOrder.length})`);
    console.log('\n→ Paste in your AI editor, run audit, fix issues');
    console.log('→ Press Enter when complete...\n');

    await new Promise((resolve) => {
        process.stdin.once('data', () => resolve(true));
    });

    markDoneFile(next as string);
}

function check(required?: string) {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();

    let categories: string[] = [];
    if (required) {
        categories = required.split(',').map((cat) => cat.trim().toLowerCase());
    }

    const missing: string[] = [];
    for (const p of runOrder) {
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
    }

    if (missing.length === 0) {
        console.log('all required prompts complete');
        process.exit(0);
    } else {
        console.log(`missing ${missing.length} required prompt(s):`);
        for (const m of missing) {
            console.log(`  ${lib.getPromptName(m)}`);
        }
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
redpen <command> [name|number]

  ${c.yellow('interactive')}    ${c.dim('launch interactive TUI mode')}
  
  init           select platform (legacy init)
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
  verify         validate prompt standard
  completion     output shell completion script
  reset          clear progress
  --version      show version

${c.dim('v2 Orchestration Commands:')}
  setup                 interactive setup wizard
  team start [name]     start team orchestration
  team stop [name]      stop team
  team status [name]    show team status
  team list             list active teams
  hud [--preset]        show HUD
  agents list           list all agent definitions
  agents show <name>    show agent details
  skills list           list skills
  config generate       generate config.toml

${c.dim('Interactive Mode:')}
  redpen interactive    ${c.dim('or')} redpen i
  ${c.dim('/ - command palette, arrow keys to navigate')}
  ${c.dim('1-9 quick copy, r=run, c=copy, d=done, q=quit')}
`);
}

function completion() {
    const script = `
# redpen shell completion
_redpen() {
    local commands="init run order next status list show copy done skip undo check report doctor verify completion reset help team hud hooks setup agents skills config"
    local categories="security quality architecture process frontend interface product growth mobile"
    local team_cmds="start stop status list"
    
    case "\${COMP_WORDS[1]}" in
        order|check)
            COMPREPLY=( $(compgen -W "$categories" -- "\${COMP_WORDS[2]}") )
            ;;
        team)
            COMPREPLY=( $(compgen -W "$team_cmds" -- "\${COMP_WORDS[2]}") )
            ;;
        *)
            COMPREPLY=( $(compgen -W "$commands" -- "\${COMP_WORDS[1]}") )
            ;;
    esac
}
complete -F _redpen redpen
`;
    console.log(script);
}

function report() {
    const progress = lib.getProgress();
    const runOrder = lib.getRunOrder();
    const config = lib.getConfig() || {};

    let md = '# Audit Report\n\n';
    md += `**Platform**: ${(config as any).platform || 'unknown'}\n`;
    md += `**Progress**: ${progress.completed.length}/${runOrder.length}\n`;
    md += `**Generated**: ${new Date().toISOString()}\n\n`;

    md += '## Completed\n\n';
    if (progress.completed.length === 0) {
        md += '_None_\n';
    } else {
        for (const p of progress.completed) {
            const version = progress.versions?.[p] || 'unknown';
            md += `- [x] ${lib.getPromptName(p)} (v${version})\n`;
        }
    }

    md += '\n## Pending\n\n';
    const pending = runOrder.filter((p: string) => !progress.completed.includes(p));
    if (pending.length === 0) {
        md += '_All complete_\n';
    } else {
        for (const p of pending) {
            md += `- [ ] ${lib.getPromptName(p)}\n`;
        }
    }

    if (progress.skipped?.length && progress.skipped.length > 0) {
        md += '\n## Skipped\n\n';
        for (const p of progress.skipped) {
            md += `- ${lib.getPromptName(p)}\n`;
        }
    }

    console.log(md);
}

function verify() {
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'check-prompts.mjs');
    try {
        execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    } catch {
        process.exit(1);
    }
}

function reset() {
    lib.resetProgress();
    console.log('reset');
}

async function handleTeam(args: string[]) {
    const cmd = args[0];
    const teamName = args[1] || 'default';

    switch (cmd) {
        case 'start':
            console.log(`Starting team: ${teamName}`);
            await startTeam({
                name: teamName,
                goal: 'Ad-hoc CLI run',
                leaderId: 'cli',
                cwd: process.cwd(),
                workers: [{ id: 'worker-1', role: 'executor' }],
            });
            break;
        case 'stop':
            console.log(`Stopping team: ${teamName}`);
            await shutdownTeam(teamName);
            break;
        case 'status': {
            const state = await getTeamState(teamName);
            console.log(JSON.stringify(state, null, 2));
            break;
        }
        case 'list': {
            try {
                const dir = await getTeamDir();
                const dirs = await fs.readdir(dir);
                console.log('Active teams:');
                for (const d of dirs) {
                    console.log(`  - ${d}`);
                }
            } catch {
                console.log('No active teams.');
            }
            break;
        }
        default:
            console.log('Unknown team command. Use start, stop, status, or list.');
            break;
    }
}

async function handleAgents(args: string[]) {
    const cmd = args[0];
    if (cmd === 'list') {
        const agents = AGENT_DEFINITIONS;
        console.log(`Loaded ${agents.length} agents:\n`);
        for (const a of agents) {
            console.log(`- ${c.bold(a.name)} (${a.category})`);
        }
    } else if (cmd === 'show' && args[1]) {
        const agent = getAgent(args[1] as string);
        if (!agent) {
            console.log(`Agent ${args[1]} not found.`);
        } else {
            console.log(JSON.stringify(agent, null, 2));
        }
    } else {
        console.log('Usage: redpen agents list | show <name>');
    }
}

async function handleSkills(args: string[]) {
    const cmd = args[0];
    if (cmd === 'list') {
        const skills = await listSkills();
        console.log(`Loaded ${skills.length} skills:\n`);
        for (const s of skills) {
            console.log(`- ${c.bold(s.name)}`);
        }
    } else {
        console.log('Usage: redpen skills list');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const arg = args[1];

    const runOrder = lib.getRunOrder();

    switch (command) {
        case 'interactive':
        case 'i':
        case 'tui': {
            try {
                const mod = (await import('../tui/index.js')) as any;
                const tui = new mod.TUI();
                await tui.start();
            } catch (e: any) {
                if (e.code === 'ERR_MODULE_NOT_FOUND') {
                    console.log('TUI module not yet compiled.');
                } else {
                    console.error(e);
                }
            }
            break;
        }
        case 'init':
            console.log('Legacy init deprecated. Use: redpen setup');
            break;
        case 'setup':
            await runSetup();
            break;
        case 'team':
            await handleTeam(args.slice(1));
            break;
        case 'hud': {
            if (args.includes('--watch')) {
                const isJson = args.includes('--json');
                watchHudState((state: any) => {
                    if (isJson) {
                        console.log(JSON.stringify(state));
                    } else {
                        console.log(renderHud(state, 'full'));
                    }
                });
            } else {
                const mockState = {
                    mode: 'action',
                    teamName: 'CLI',
                    phase: 'plan',
                    workers: [],
                    completed: 0,
                    total: 0,
                    percent: 0,
                    spinnerIdx: 0,
                    lastMessage: 'Ready',
                    recentLog: [],
                } as any;
                const output = renderHud(mockState, 'full');
                console.log(output);
            }
            break;
        }
        case 'agents':
            await handleAgents(args.slice(1));
            break;
        case 'skills':
            await handleSkills(args.slice(1));
            break;
        case 'config':
            if (arg === 'generate') {
                await generateAllConfigs(process.cwd(), process.cwd());
                console.log('Configs generated.');
            }
            break;
        case 'hooks':
            if (arg === 'list') {
                const plugins = getLoadedPlugins();
                console.log('Plugins:', plugins);
            }
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
            let showFile = lib.resolvePrompt(arg as string, runOrder);
            if (!showFile) {
                console.error(`not found: ${arg}`);
                process.exit(1);
            }
            showPrompt(showFile);
            break;
        }
        case 'copy': {
            let copyFile = lib.resolvePrompt(arg as string, runOrder);
            if (!copyFile) {
                console.error(`not found: ${arg}`);
                process.exit(1);
            }
            copyPrompt(copyFile);
            break;
        }
        case 'done': {
            let doneFile = lib.resolvePrompt(arg as string, runOrder);
            if (!doneFile) {
                console.error(`not found: ${arg}`);
                process.exit(1);
            }
            markDoneFile(doneFile);
            break;
        }
        case 'skip': {
            let skipFile = lib.resolvePrompt(arg as string, runOrder);
            if (!skipFile) {
                console.error(`not found: ${arg}`);
                process.exit(1);
            }
            skipCommand(skipFile);
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
            await runDoctor({ json: args.includes('--json') });
            break;
        case 'verify':
            verify();
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
                try {
                    const mod = (await import('../tui/index.js')) as any;
                    const tui = new mod.TUI();
                    await tui.start();
                } catch (e: any) {
                    if (e.code === 'ERR_MODULE_NOT_FOUND') {
                        console.log('TUI module not yet compiled.');
                    } else {
                        console.error(e);
                    }
                }
            }
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
