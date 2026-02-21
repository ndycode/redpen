/**
 * redpen v2.0.0 — Interactive setup wizard
 * 8-step wizard: Welcome → Stack Detection → Confirmation → Agents →
 *                Models → Prompts → Config Generation → Verification
 *
 * Uses Node.js built-in readline only (no external prompt libraries).
 * Supports --non-interactive mode for CI environments.
 */

import { createInterface, type Interface } from 'node:readline';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupOptions {
    force?: boolean;
    nonInteractive?: boolean;
    verbose?: boolean;
}

interface DetectedStack {
    platform: 'web' | 'mobile';
    frontend?: string;
    backend?: string;
    framework?: string;
}

interface AgentSelection {
    planning: boolean;
    execution: boolean;
    review: boolean;
    research: boolean;
    specialized: boolean;
}

interface ModelTierConfig {
    primary: string;
    secondary: string;
    tertiary: string;
}

interface PromptSelection {
    core: boolean;
    web: boolean;
    mobile: boolean;
    ai: boolean;
    devops: boolean;
}

interface SetupConfig {
    version: string;
    platform: string;
    frontend: string;
    backend: string;
    framework?: string;
    agents: AgentSelection;
    models: ModelTierConfig;
    prompts: PromptSelection;
    configuredAt: string;
}

// ── ANSI colours (no external deps) ─────────────────────────────────────────

const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

function colorize(text: string, ...styles: string[]): string {
    return `${styles.join('')}${text}${c.reset}`;
}

// ── readline helpers ──────────────────────────────────────────────────────────

function ask(rl: Interface, question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim() || defaultValue || ''));
    });
}

async function askYesNo(rl: Interface, question: string, defaultYes = true): Promise<boolean> {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = await ask(rl, `${question} ${colorize(hint, c.dim)} `, defaultYes ? 'y' : 'n');
    return answer.toLowerCase().startsWith('y');
}

async function askChoice(rl: Interface, question: string, choices: string[], defaultChoice: string): Promise<string> {
    const formatted = choices.map((ch, i) => `  ${colorize(String(i + 1), c.cyan)}. ${ch}`).join('\n');
    console.log(question);
    console.log(formatted);
    const answer = await ask(rl, `${colorize('>', c.cyan)} `, defaultChoice);
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < choices.length) {
        return choices[idx] ?? defaultChoice;
    }
    return answer || defaultChoice;
}

// ── Config directory helpers (mirrors lib/config.cjs) ────────────────────────

function getConfigDir(): string {
    const home = homedir();
    switch (platform()) {
        case 'win32':
            return join(process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming'), 'redpen');
        case 'darwin':
            return join(home, 'Library', 'Application Support', 'redpen');
        default:
            return join(process.env['XDG_CONFIG_HOME'] ?? join(home, '.config'), 'redpen');
    }
}

function getProjectHash(): string {
    try {
        const remote = execSync('git config --get remote.origin.url', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return createHash('md5').update(remote).digest('hex').slice(0, 12);
    } catch {
        return createHash('md5').update(process.cwd()).digest('hex').slice(0, 12);
    }
}

function getProjectConfigDir(): string {
    const dir = join(getConfigDir(), 'projects', getProjectHash());
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// ── Stack detection (TypeScript port of lib/config.cjs detectStack) ───────────

interface PackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

const STACK_DEFAULTS: DetectedStack = {
    platform: 'web',
    frontend: 'none',
    backend: 'none',
};

function detectStack(cwd: string): DetectedStack {
    const pubspecPath = join(cwd, 'pubspec.yaml');
    const pkgPath = join(cwd, 'package.json');

    if (existsSync(pubspecPath)) {
        return { platform: 'mobile', framework: 'flutter' };
    }

    if (!existsSync(pkgPath)) {
        return STACK_DEFAULTS;
    }

    try {
        const raw = readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw) as PackageJson;
        const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['react-native'] !== undefined) {
            return { platform: 'mobile', framework: 'react-native' };
        }

        const detected: DetectedStack = {
            platform: 'web',
            frontend: 'none',
            backend: 'none',
        };

        if (deps['next'] !== undefined) detected.frontend = 'nextjs';
        else if (deps['react'] !== undefined) detected.frontend = 'react';
        else if (deps['vue'] !== undefined) detected.frontend = 'vue';

        if (deps['@supabase/supabase-js'] !== undefined) detected.backend = 'supabase';
        else if (deps['firebase'] !== undefined) detected.backend = 'firebase';
        else if (deps['@prisma/client'] !== undefined) detected.backend = 'prisma';

        return detected;
    } catch {
        return STACK_DEFAULTS;
    }
}

// ── Step renderers ────────────────────────────────────────────────────────────

function printBanner(): void {
    console.log(colorize('\n  ██████╗ ███████╗██████╗ ██████╗ ███████╗███╗   ██╗', c.red, c.bold));
    console.log(colorize('  ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝████╗  ██║', c.red, c.bold));
    console.log(colorize('  ██████╔╝█████╗  ██║  ██║██████╔╝█████╗  ██╔██╗ ██║', c.red, c.bold));
    console.log(colorize('  ██╔══██╗██╔══╝  ██║  ██║██╔═══╝ ██╔══╝  ██║╚██╗██║', c.red, c.bold));
    console.log(colorize('  ██║  ██║███████╗██████╔╝██║     ███████╗██║ ╚████║', c.red, c.bold));
    console.log(colorize('  ╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝', c.red, c.bold));
    console.log(colorize('                                              v2.0.0\n', c.dim));
}

function printStep(step: number, total: number, label: string): void {
    const badge = colorize(`[${step}/${total}]`, c.cyan, c.bold);
    console.log(`\n${badge} ${colorize(label, c.bold)}`);
    console.log(colorize('─'.repeat(50), c.dim));
}

function printKeyValue(key: string, value: string): void {
    console.log(`  ${colorize(key + ':', c.dim)} ${colorize(value, c.white)}`);
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export async function setup(options: SetupOptions = {}): Promise<void> {
    const { force = false, nonInteractive = false, verbose = false } = options;

    // ── Step 1: Welcome ───────────────────────────────────────────────────────
    printStep(1, 8, 'Welcome to redpen v2.0.0');
    printBanner();
    console.log('  This wizard configures redpen for your project.');
    console.log('  It will auto-detect your stack and write a config file.\n');

    if (nonInteractive) {
        console.log(colorize('  Running in non-interactive mode (CI defaults).', c.yellow));
    }

    // Check for existing config
    const configDir = getProjectConfigDir();
    const configFile = join(configDir, 'config.json');

    if (existsSync(configFile) && !force) {
        if (nonInteractive) {
            console.log(colorize('  Config already exists. Use --force to overwrite.', c.yellow));
            console.log(colorize('\nSetup skipped — already configured.', c.green));
            return;
        }
        // In interactive mode, we'll ask later
    }

    const rl = nonInteractive ? null : createInterface({ input: process.stdin, output: process.stdout });

    try {
        // ── Step 2: Stack Detection ───────────────────────────────────────────
        printStep(2, 8, 'Detecting your stack...');
        const detected = detectStack(process.cwd());

        if (verbose) {
            console.log('  Scanning:');
            console.log(colorize('    • pubspec.yaml → Flutter', c.dim));
            console.log(colorize('    • package.json → frontend/backend deps', c.dim));
        }

        const isMobile = detected.platform === 'mobile';
        printKeyValue('Platform', detected.platform);
        if (isMobile && detected.framework !== undefined) {
            printKeyValue('Framework', detected.framework);
        } else {
            printKeyValue('Frontend', detected.frontend ?? 'none');
            printKeyValue('Backend', detected.backend ?? 'none');
        }
        console.log(colorize(`\n  Detection complete.`, c.green));

        // ── Step 3: Stack Confirmation ────────────────────────────────────────
        printStep(3, 8, 'Confirming stack...');
        let stack: DetectedStack = { ...detected };

        if (!nonInteractive && rl !== null) {
            const confirmed = await askYesNo(rl, '  Detected stack looks correct?', true);

            if (!confirmed) {
                console.log('\n  Override platform:');
                const platformChoice = await askChoice(rl, '', ['web', 'mobile'], stack.platform);
                stack.platform = platformChoice === 'mobile' ? 'mobile' : 'web';

                if (stack.platform === 'mobile') {
                    const fw = await ask(
                        rl,
                        `  Framework ${colorize('[flutter/react-native]', c.dim)}: `,
                        stack.framework ?? 'flutter'
                    );
                    stack.framework = fw;
                    stack.frontend = undefined;
                    stack.backend = undefined;
                } else {
                    const feOptions = ['nextjs', 'react', 'vue', 'svelte', 'none'];
                    const feChoice = await askChoice(rl, '  Frontend:', feOptions, stack.frontend ?? 'none');
                    stack.frontend = feChoice;

                    const beOptions = ['supabase', 'firebase', 'prisma', 'none'];
                    const beChoice = await askChoice(rl, '  Backend:', beOptions, stack.backend ?? 'none');
                    stack.backend = beChoice;
                }
            }
        }

        console.log(colorize('  Stack confirmed.', c.green));

        // ── Step 4: Agent Configuration ───────────────────────────────────────
        printStep(4, 8, 'Agent Configuration');
        console.log('  Select which agent categories to enable.');
        console.log(colorize('  (All enabled by default)', c.dim));

        const agents: AgentSelection = {
            planning: true,
            execution: true,
            review: true,
            research: true,
            specialized: false,
        };

        if (!nonInteractive && rl !== null) {
            console.log('');
            agents.planning = await askYesNo(rl, '  Enable Planning agents (analyst, planner, architect)?', true);
            agents.execution = await askYesNo(rl, '  Enable Execution agents (executor, debugger, verifier)?', true);
            agents.review = await askYesNo(rl, '  Enable Review agents (code-reviewer, security-reviewer)?', true);
            agents.research = await askYesNo(
                rl,
                '  Enable Research agents (explore, researcher, ux-researcher)?',
                true
            );
            agents.specialized = await askYesNo(
                rl,
                '  Enable Specialized agents (test-engineer, designer, writer)?',
                false
            );
        }

        const enabledAgentCategories = Object.entries(agents)
            .filter(([, enabled]) => enabled)
            .map(([cat]) => cat)
            .join(', ');
        console.log(`\n  Enabled: ${colorize(enabledAgentCategories, c.cyan)}`);

        // ── Step 5: Model Tier Setup ──────────────────────────────────────────
        printStep(5, 8, 'Model Tier Setup');
        console.log('  Assign models to each tier (primary / secondary / tertiary).');
        console.log(colorize('  Press Enter to accept defaults.', c.dim));

        const models: ModelTierConfig = {
            primary: 'claude-sonnet-4-20250514',
            secondary: 'claude-haiku-35-20241022',
            tertiary: 'gpt-4o-mini',
        };

        if (!nonInteractive && rl !== null) {
            console.log('');
            const p = await ask(rl, `  Primary   ${colorize('[claude-sonnet-4-20250514]', c.dim)}: `, models.primary);
            models.primary = p;

            const s = await ask(rl, `  Secondary ${colorize('[claude-haiku-35-20241022]', c.dim)}: `, models.secondary);
            models.secondary = s;

            const t = await ask(rl, `  Tertiary  ${colorize('[gpt-4o-mini]', c.dim)}: `, models.tertiary);
            models.tertiary = t;
        }

        printKeyValue('Primary', models.primary);
        printKeyValue('Secondary', models.secondary);
        printKeyValue('Tertiary', models.tertiary);

        // ── Step 6: Prompt Selection ──────────────────────────────────────────
        printStep(6, 8, 'Prompt Selection');
        console.log('  Choose which prompt categories to load.');

        const isMobileStack = stack.platform === 'mobile';
        const isWebStack = stack.platform === 'web';

        const prompts: PromptSelection = {
            core: true,
            web: isWebStack,
            mobile: isMobileStack,
            ai: false,
            devops: false,
        };

        if (!nonInteractive && rl !== null) {
            console.log('');
            prompts.core = await askYesNo(rl, '  core (security, quality, architecture — always recommended)?', true);
            prompts.web = await askYesNo(rl, '  web (Next.js, React, Vue, Supabase, etc.)?', isWebStack);
            prompts.mobile = await askYesNo(rl, '  mobile (Flutter, React Native)?', isMobileStack);
            prompts.ai = await askYesNo(rl, '  ai (LLM integrations, AI-specific patterns)?', false);
            prompts.devops = await askYesNo(rl, '  devops (CI/CD, Docker, infra)?', false);
        }

        const enabledPrompts = Object.entries(prompts)
            .filter(([, enabled]) => enabled)
            .map(([cat]) => cat)
            .join(', ');
        console.log(`\n  Enabled: ${colorize(enabledPrompts, c.cyan)}`);

        // ── Step 7: Config Generation ─────────────────────────────────────────
        printStep(7, 8, 'Generating configuration...');

        if (existsSync(configFile) && !force && !nonInteractive && rl !== null) {
            const overwrite = await askYesNo(rl, '  Config already exists. Overwrite?', false);
            if (!overwrite) {
                console.log(colorize('  Keeping existing config.', c.yellow));
                printStep(8, 8, 'Verification');
                console.log(colorize('\n  Setup skipped — existing config preserved.', c.yellow));
                console.log('\n  Run "redpen doctor" to verify your configuration.');
                return;
            }
        }

        const config: SetupConfig = {
            version: '2.0.0',
            platform: stack.platform,
            frontend: stack.frontend ?? 'none',
            backend: stack.backend ?? 'none',
            agents,
            models,
            prompts,
            configuredAt: new Date().toISOString(),
        };

        if (stack.framework !== undefined) {
            config.framework = stack.framework;
        }

        mkdirSync(configDir, { recursive: true });
        writeFileSync(configFile, JSON.stringify(config, null, 2));

        if (verbose) {
            console.log(`\n  Written to: ${colorize(configFile, c.cyan)}`);
        } else {
            console.log(colorize('  Config written successfully.', c.green));
        }

        // ── Step 8: Verification ──────────────────────────────────────────────
        printStep(8, 8, 'Verification');
        console.log('');

        const saved = JSON.parse(readFileSync(configFile, 'utf-8')) as SetupConfig;
        console.log(colorize('  ✓ Config file verified', c.green));
        printKeyValue('  Location', configFile);
        printKeyValue('  Platform', saved.platform);
        if (saved.framework !== undefined) {
            printKeyValue('  Framework', saved.framework);
        } else {
            printKeyValue('  Frontend', saved.frontend);
            printKeyValue('  Backend', saved.backend);
        }
        printKeyValue(
            '  Agents',
            Object.entries(saved.agents)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(', ')
        );
        printKeyValue(
            '  Prompts',
            Object.entries(saved.prompts)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(', ')
        );

        console.log(colorize('\n  ════════════════════════════════════════════════', c.dim));
        console.log(colorize('  Setup complete! redpen v2.0.0 is ready.', c.green, c.bold));
        console.log(colorize('  ════════════════════════════════════════════════\n', c.dim));
        console.log(`  Next steps:`);
        console.log(colorize('    • redpen         — launch the interactive TUI', c.dim));
        console.log(colorize('    • redpen doctor   — verify config & paths', c.dim));
        console.log(colorize('    • redpen check    — CI mode (exit 1 if incomplete)\n', c.dim));
    } finally {
        if (rl !== null) {
            rl.close();
        }
    }
}
