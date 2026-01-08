#!/usr/bin/env node
/**
 * redpen TUI - OpenCode-inspired minimal design
 * Includes Init flow for first-time setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');
const CONFIG_FILE = path.join(process.cwd(), '.redpenrc');
const CUSTOM_DIR = path.join(process.cwd(), '.redpen');

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI
// ═══════════════════════════════════════════════════════════════════════════════
const ESC = '\x1b';
const CSI = `${ESC}[`;

const term = {
    alt: `${CSI}?1049h`,
    main: `${CSI}?1049l`,
    hide: `${CSI}?25l`,
    show: `${CSI}?25h`,
    home: `${CSI}H`,
    clear: `${CSI}2J`,
    reset: `${CSI}0m`,
    bold: `${CSI}1m`,
    dim: `${CSI}2m`,
    italic: `${CSI}3m`,
    fg: (r, g, b) => `${CSI}38;2;${r};${g};${b}m`,
    bg: (r, g, b) => `${CSI}48;2;${r};${g};${b}m`,
};

// Red Theme - Cursor-inspired with red as primary accent
const C = {
    // Backgrounds
    base:      [24, 24, 24],      // #181818
    panel:     [20, 20, 20],      // #141414
    element:   [38, 38, 38],      // #262626
    selected:  [50, 35, 40],      // darker red tint
    
    // Borders
    border:    [50, 50, 50],      // subtle border
    borderAct: [227, 70, 113],    // red active border
    
    // Text
    text:      [228, 228, 228],   // #e4e4e4
    muted:     [140, 140, 140],   // muted text
    dim:       [90, 90, 90],      // dim text
    
    // Primary = Red
    primary:   [227, 70, 113],    // #e34671 - main red
    primaryBr: [252, 107, 131],   // #fc6b83 - bright red
    
    // Secondary colors  
    green:     [63, 162, 102],    // #3fa266
    greenBr:   [112, 180, 137],   // #70b489
    yellow:    [241, 180, 103],   // #f1b467
    orange:    [210, 148, 62],    // #d2943e
    cyan:      [136, 192, 208],   // #88c0d0
    blue:      [129, 161, 193],   // #81a1c1
    pink:      [227, 148, 220],   // #E394DC
    purple:    [170, 160, 250],   // #AAA0FA
    teal:      [130, 210, 206],   // #82D2CE
};

const fg = (c) => term.fg(c[0], c[1], c[2]);
const bg = (c) => term.bg(c[0], c[1], c[2]);

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════
function getBranch() {
    try { return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
    catch { return null; }
}

function getProgressFile() {
    const branch = getBranch();
    return path.join(process.cwd(), branch ? `.redpen-progress-${branch.replace(/[^a-zA-Z0-9-]/g, '-')}.json` : '.redpen-progress.json');
}

function getConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch { return null; }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getProgress() {
    try { return JSON.parse(fs.readFileSync(getProgressFile(), 'utf-8')); } catch { return { completed: [] }; }
}

function saveProgress(progress) {
    fs.writeFileSync(getProgressFile(), JSON.stringify(progress, null, 2));
}

function getVersion() {
    try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version; } catch { return '0.0.0'; }
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.txt')).map(f => path.join(dir, f)).sort();
}

function scanDirRecursive(dir) {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory() && f !== 'workflow') files.push(...scanDirRecursive(full));
        else if (stat.isFile() && f.endsWith('.txt')) files.push(full);
    });
    return files.sort();
}

function getRunOrder() {
    const config = getConfig() || { platform: 'web', frontend: 'nextjs', backend: 'supabase' };
    const prompts = [];
    ['security', 'quality', 'architecture', 'process'].forEach(cat => {
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'core', cat)));
    });
    if (config.platform === 'mobile') {
        prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', 'core')));
        if (config.framework && config.framework !== 'none') prompts.push(...scanDirRecursive(path.join(PROMPTS_DIR, 'mobile', config.framework)));
    } else {
        if (config.frontend && config.frontend !== 'none') {
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'frontend', config.frontend)));
            prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'interface')));
        }
        if (config.backend && config.backend !== 'none') prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'backend', config.backend)));
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'product')));
        prompts.push(...scanDir(path.join(PROMPTS_DIR, 'web', 'growth')));
    }
    if (fs.existsSync(CUSTOM_DIR)) prompts.push(...scanDirRecursive(CUSTOM_DIR));
    return prompts.map(p => p.startsWith(CUSTOM_DIR)
        ? 'custom/' + path.relative(CUSTOM_DIR, p).replace(/\\/g, '/')
        : path.relative(PROMPTS_DIR, p).replace(/\\/g, '/'));
}

function getPromptContent(item) {
    const fullPath = item.startsWith('custom/')
        ? path.join(CUSTOM_DIR, item.replace('custom/', ''))
        : path.join(PROMPTS_DIR, item);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
}

function detectStack() {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pubspecPath = path.join(process.cwd(), 'pubspec.yaml');

    // Check for Flutter (pubspec.yaml)
    if (fs.existsSync(pubspecPath)) {
        return { platform: 'mobile', framework: 'flutter' };
    }

    if (!fs.existsSync(pkgPath)) return { platform: 'web', frontend: 'nextjs', backend: 'supabase' };

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Check for React Native
        if (deps['react-native']) {
            return { platform: 'mobile', framework: 'react-native' };
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
        return { platform: 'web', frontend: 'nextjs', backend: 'supabase' };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INIT TUI - First time setup screen
// ═══════════════════════════════════════════════════════════════════════════════

const INIT_STEPS = {
    PLATFORM: 'platform',
    FRONTEND: 'frontend',
    BACKEND: 'backend',
    FRAMEWORK: 'framework',
    CONFIRM: 'confirm'
};

const PLATFORMS = [
    { id: 'web', label: 'Web', desc: 'Next.js, React, Vue + Supabase, Firebase, Prisma' },
    { id: 'mobile', label: 'Mobile', desc: 'Flutter, React Native, Native iOS/Android' },
];

const FRONTENDS = [
    { id: 'nextjs', label: 'Next.js', desc: 'React framework with SSR, routing, API routes' },
    { id: 'react', label: 'React', desc: 'Client-side React SPA' },
    { id: 'vue', label: 'Vue', desc: 'Vue.js framework' },
    { id: 'none', label: 'None', desc: 'Backend only / API project' },
];

const BACKENDS = [
    { id: 'supabase', label: 'Supabase', desc: 'PostgreSQL, Auth, Realtime, Storage' },
    { id: 'firebase', label: 'Firebase', desc: 'Firestore, Auth, Cloud Functions' },
    { id: 'prisma', label: 'Prisma', desc: 'TypeScript ORM for any database' },
    { id: 'none', label: 'None', desc: 'Frontend only / static site' },
];

const FRAMEWORKS = [
    { id: 'flutter', label: 'Flutter', desc: 'Dart framework for iOS, Android, Web' },
    { id: 'react-native', label: 'React Native', desc: 'React for native iOS/Android' },
    { id: 'native', label: 'Native', desc: 'Swift/Kotlin native development' },
    { id: 'none', label: 'None', desc: 'Cross-platform prompts only' },
];

class InitTUI {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.W = process.stdout.columns || 80;
        this.H = process.stdout.rows || 24;
        this.running = false;
        
        // State
        this.step = INIT_STEPS.PLATFORM;
        this.selectedIdx = 0;
        this.config = detectStack();
        
        // Pre-select detected values
        this.detectedPlatform = this.config.platform;
        this.detectedFrontend = this.config.frontend;
        this.detectedBackend = this.config.backend;
        this.detectedFramework = this.config.framework;
    }

    start() {
        this.running = true;
        process.stdout.write(term.alt + term.hide);
        
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        this.inputHandler = d => this.input(d);
        process.stdin.on('data', this.inputHandler);
        
        process.on('SIGINT', () => this.quit());
        process.on('SIGWINCH', () => {
            this.W = process.stdout.columns || 80;
            this.H = process.stdout.rows || 24;
            this.render();
        });

        // Pre-select detected option
        this.preselectDetected();
        this.render();
    }

    preselectDetected() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM:
                this.selectedIdx = PLATFORMS.findIndex(p => p.id === this.detectedPlatform);
                break;
            case INIT_STEPS.FRONTEND:
                this.selectedIdx = FRONTENDS.findIndex(f => f.id === this.detectedFrontend);
                break;
            case INIT_STEPS.BACKEND:
                this.selectedIdx = BACKENDS.findIndex(b => b.id === this.detectedBackend);
                break;
            case INIT_STEPS.FRAMEWORK:
                this.selectedIdx = FRAMEWORKS.findIndex(f => f.id === this.detectedFramework);
                break;
        }
        if (this.selectedIdx < 0) this.selectedIdx = 0;
    }

    getCurrentOptions() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM: return PLATFORMS;
            case INIT_STEPS.FRONTEND: return FRONTENDS;
            case INIT_STEPS.BACKEND: return BACKENDS;
            case INIT_STEPS.FRAMEWORK: return FRAMEWORKS;
            default: return [];
        }
    }

    getStepTitle() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM: return 'Select Platform';
            case INIT_STEPS.FRONTEND: return 'Select Frontend';
            case INIT_STEPS.BACKEND: return 'Select Backend';
            case INIT_STEPS.FRAMEWORK: return 'Select Framework';
            case INIT_STEPS.CONFIRM: return 'Confirm Configuration';
            default: return '';
        }
    }

    getStepNumber() {
        if (this.config.platform === 'web') {
            switch (this.step) {
                case INIT_STEPS.PLATFORM: return [1, 3];
                case INIT_STEPS.FRONTEND: return [2, 3];
                case INIT_STEPS.BACKEND: return [3, 3];
                case INIT_STEPS.CONFIRM: return [3, 3];
            }
        } else {
            switch (this.step) {
                case INIT_STEPS.PLATFORM: return [1, 2];
                case INIT_STEPS.FRAMEWORK: return [2, 2];
                case INIT_STEPS.CONFIRM: return [2, 2];
            }
        }
        return [1, 3];
    }

    quit() {
        this.running = false;
        process.stdin.removeListener('data', this.inputHandler);
        process.stdout.write(term.show + term.main);
        process.exit(0);
    }

    input(data) {
        if (!this.running) return;
        const s = data.toString();
        
        // Ctrl+C
        if (s === '\x03') return this.quit();
        
        // Ignore mouse scroll events (X10, SGR, urxvt protocols)
        if (s.startsWith('\x1b[M') || s.startsWith('\x1b[<') || s.startsWith('\x1b[3')) return;
        
        const options = this.getCurrentOptions();
        
        if (this.step === INIT_STEPS.CONFIRM) {
            if (s === '\r' || s === '\n' || s === 'y' || s === 'Y') {
                this.finish();
                return;
            }
            if (s === 'n' || s === 'N' || s === '\x1b') {
                // Go back to platform
                this.step = INIT_STEPS.PLATFORM;
                this.preselectDetected();
            }
        } else {
            // Navigation
            if (s === '\x1b[A' || s === '\x1bOA' || s === 'k') {
                this.selectedIdx = Math.max(0, this.selectedIdx - 1);
            } else if (s === '\x1b[B' || s === '\x1bOB' || s === 'j') {
                this.selectedIdx = Math.min(options.length - 1, this.selectedIdx + 1);
            }
            // Selection
            else if (s === '\r' || s === '\n' || s === ' ') {
                this.select();
            }
            // Back
            else if (s === '\x1b') {
                this.goBack();
            }
            // Quick number selection
            else if (s >= '1' && s <= '9') {
                const idx = parseInt(s, 10) - 1;
                if (idx < options.length) {
                    this.selectedIdx = idx;
                    this.select();
                }
            }
        }
        
        this.render();
    }

    select() {
        const options = this.getCurrentOptions();
        const selected = options[this.selectedIdx];
        
        switch (this.step) {
            case INIT_STEPS.PLATFORM:
                this.config.platform = selected.id;
                if (selected.id === 'web') {
                    this.step = INIT_STEPS.FRONTEND;
                    delete this.config.framework;
                } else {
                    this.step = INIT_STEPS.FRAMEWORK;
                    delete this.config.frontend;
                    delete this.config.backend;
                }
                this.preselectDetected();
                break;
            case INIT_STEPS.FRONTEND:
                this.config.frontend = selected.id;
                this.step = INIT_STEPS.BACKEND;
                this.preselectDetected();
                break;
            case INIT_STEPS.BACKEND:
                this.config.backend = selected.id;
                this.step = INIT_STEPS.CONFIRM;
                break;
            case INIT_STEPS.FRAMEWORK:
                this.config.framework = selected.id;
                this.step = INIT_STEPS.CONFIRM;
                break;
        }
    }

    goBack() {
        switch (this.step) {
            case INIT_STEPS.FRONTEND:
            case INIT_STEPS.FRAMEWORK:
                this.step = INIT_STEPS.PLATFORM;
                break;
            case INIT_STEPS.BACKEND:
                this.step = INIT_STEPS.FRONTEND;
                break;
            case INIT_STEPS.CONFIRM:
                if (this.config.platform === 'web') {
                    this.step = INIT_STEPS.BACKEND;
                } else {
                    this.step = INIT_STEPS.FRAMEWORK;
                }
                break;
        }
        this.preselectDetected();
    }

    finish() {
        saveConfig(this.config);
        this.running = false;
        process.stdin.removeListener('data', this.inputHandler);
        // Don't exit screen yet, let the main TUI take over
        if (this.onComplete) {
            this.onComplete(this.config);
        }
    }

    render() {
        const W = this.W;
        const H = this.H;
        const out = [];
        
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        const center = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            const left = Math.floor((w - stripped.length) / 2);
            return ' '.repeat(Math.max(0, left)) + s;
        };

        // Clear with background
        out.push('');
        
        // ─── Header ───
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        const ver = `${fg(C.dim)}v${getVersion()}${term.reset}`;
        out.push(pad(`  ${title} ${ver}  ${fg(C.yellow)}Setup${term.reset}`, W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

        // ─── Step indicator ───
        const [stepNum, totalSteps] = this.getStepNumber();
        const stepTitle = this.getStepTitle();
        const stepIndicator = `${fg(C.muted)}Step ${stepNum}/${totalSteps}${term.reset}`;
        out.push(pad(`  ${stepIndicator}  ${fg(C.text)}${term.bold}${stepTitle}${term.reset}`, W));
        out.push('');

        if (this.step === INIT_STEPS.CONFIRM) {
            // ─── Confirmation screen ───
            out.push(pad(`  ${fg(C.muted)}Your configuration:${term.reset}`, W));
            out.push('');
            
            out.push(pad(`    ${fg(C.cyan)}Platform${term.reset}    ${fg(C.text)}${this.config.platform}${term.reset}`, W));
            
            if (this.config.platform === 'web') {
                const frontendLabel = FRONTENDS.find(f => f.id === this.config.frontend)?.label || this.config.frontend;
                const backendLabel = BACKENDS.find(b => b.id === this.config.backend)?.label || this.config.backend;
                out.push(pad(`    ${fg(C.cyan)}Frontend${term.reset}    ${fg(C.text)}${frontendLabel}${term.reset}`, W));
                out.push(pad(`    ${fg(C.cyan)}Backend${term.reset}     ${fg(C.text)}${backendLabel}${term.reset}`, W));
            } else {
                const frameworkLabel = FRAMEWORKS.find(f => f.id === this.config.framework)?.label || this.config.framework;
                out.push(pad(`    ${fg(C.cyan)}Framework${term.reset}   ${fg(C.text)}${frameworkLabel}${term.reset}`, W));
            }
            
            out.push('');
            
            // Count prompts
            saveConfig(this.config); // temp save to count
            const prompts = getRunOrder();
            out.push(pad(`    ${fg(C.green)}${prompts.length}${term.reset} ${fg(C.muted)}prompts will be loaded${term.reset}`, W));
            
            out.push('');
            out.push(pad(`  ${fg(C.muted)}Config will be saved to ${fg(C.text)}.redpenrc${term.reset}`, W));
            out.push('');
            
        } else {
            // ─── Options list ───
            const options = this.getCurrentOptions();
            
            // Detect message
            const detected = this.step === INIT_STEPS.PLATFORM ? this.detectedPlatform :
                           this.step === INIT_STEPS.FRONTEND ? this.detectedFrontend :
                           this.step === INIT_STEPS.BACKEND ? this.detectedBackend :
                           this.step === INIT_STEPS.FRAMEWORK ? this.detectedFramework : null;
            
            if (detected && detected !== 'none') {
                out.push(pad(`  ${fg(C.dim)}detected: ${detected}${term.reset}`, W));
                out.push('');
            }
            
            options.forEach((opt, i) => {
                const isSelected = i === this.selectedIdx;
                const isDetected = opt.id === detected;
                
                const num = `${fg(C.dim)}${i + 1}${term.reset}`;
                const bullet = isSelected ? `${fg(C.primary)}▸${term.reset}` : ` `;
                const label = isSelected 
                    ? `${fg(C.primary)}${term.bold}${opt.label}${term.reset}`
                    : `${fg(C.text)}${opt.label}${term.reset}`;
                const desc = `${fg(C.muted)}${opt.desc}${term.reset}`;
                const detectedTag = isDetected ? `  ${fg(C.green)}(detected)${term.reset}` : '';
                
                const bgStyle = isSelected ? bg(C.selected) : '';
                
                out.push(pad(`${bgStyle}  ${bullet} ${num}  ${label}${detectedTag}${term.reset}`, W));
                out.push(pad(`${bgStyle}        ${desc}${term.reset}`, W));
                out.push(pad('', W));
            });
        }

        // Fill remaining space
        while (out.length < H - 4) out.push(pad('', W));

        // ─── Footer ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        
        let keys;
        if (this.step === INIT_STEPS.CONFIRM) {
            keys = [
                `${fg(C.primary)}Enter${fg(C.muted)} confirm`,
                `${fg(C.primary)}Esc${fg(C.muted)} go back`,
                `${fg(C.primary)}Ctrl+C${fg(C.muted)} quit`,
            ].join(`  ${fg(C.dim)}│${term.reset}  `);
        } else {
            keys = [
                `${fg(C.primary)}↑↓${fg(C.muted)} navigate`,
                `${fg(C.primary)}Enter${fg(C.muted)} select`,
                `${fg(C.primary)}Esc${fg(C.muted)} back`,
                `${fg(C.primary)}1-4${fg(C.muted)} quick select`,
            ].join(`  ${fg(C.dim)}│${term.reset}  `);
        }
        out.push(pad(`  ${keys}${term.reset}`, W));
        out.push('');

        // Write
        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN TUI
// ═══════════════════════════════════════════════════════════════════════════════

// Simple fuzzy match
function fuzzyMatch(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti++) {
        if (text[ti] === query[qi]) qi++;
    }
    return qi === query.length;
}

// UI Modes
const MODE = {
    NORMAL: 'normal',
    SEARCH: 'search',
    HELP: 'help'
};

class TUI {
    constructor() {
        this.W = process.stdout.columns || 80;
        this.H = process.stdout.rows || 24;
        this.items = [];
        this.idx = 0;
        this.running = false;
        this.toast = '';
        this.toastTimer = null;
        
        // New state
        this.mode = MODE.NORMAL;
        this.searchQuery = '';
        this.filteredItems = [];
        this.filteredIdx = 0;
    }

    start() {
        // Check if config exists - if not, run init first
        const config = getConfig();
        if (!config) {
            const initTUI = new InitTUI((savedConfig) => {
                // Init completed, now start main TUI
                this.startMain();
            });
            initTUI.start();
            return;
        }
        
        this.startMain();
    }

    startMain() {
        this.running = true;
        this.items = getRunOrder();
        
        // Find first incomplete
        const progress = getProgress();
        const firstIncomplete = this.items.findIndex(p => !progress.completed.includes(p));
        this.idx = firstIncomplete >= 0 ? firstIncomplete : 0;

        process.stdout.write(term.alt + term.hide);
        
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        
        // Remove any existing listeners and add new one
        process.stdin.removeAllListeners('data');
        process.stdin.on('data', d => this.input(d));
        
        process.on('SIGINT', () => this.quit());
        process.on('SIGWINCH', () => {
            this.W = process.stdout.columns || 80;
            this.H = process.stdout.rows || 24;
            this.render();
        });

        this.render();
    }

    quit() {
        this.running = false;
        process.stdout.write(term.show + term.main);
        process.exit(0);
    }

    input(data) {
        if (!this.running) return;
        const s = data.toString();
        
        // Ctrl+C always quits
        if (s === '\x03') return this.quit();
        
        // Ignore mouse scroll events
        if (s.startsWith('\x1b[M') || s.startsWith('\x1b[<') || s.startsWith('\x1b[3')) return;

        // Route input based on mode
        if (this.mode === MODE.HELP) {
            this.inputHelp(s);
        } else if (this.mode === MODE.SEARCH) {
            this.inputSearch(s);
        } else {
            this.inputNormal(s);
        }
        
        this.render();
    }

    // ─── NORMAL MODE INPUT ───
    inputNormal(s) {
        // Arrow keys / vim navigation
        if (s === '\x1b[D' || s === '\x1bOD' || s === 'h' || s === '\x1b[A' || s === '\x1bOA' || s === 'k') {
            this.idx = Math.max(0, this.idx - 1);
        } else if (s === '\x1b[C' || s === '\x1bOC' || s === 'l' || s === '\x1b[B' || s === '\x1bOB' || s === 'j') {
            this.idx = Math.min(this.items.length - 1, this.idx + 1);
        }
        // Home/End
        else if (s === '\x1b[H' || s === '\x1b[1~') this.idx = 0;
        else if (s === '\x1b[F' || s === '\x1b[4~') this.idx = this.items.length - 1;
        // Actions
        else if (s === 'r' || s === '\r' || s === '\n') this.run();
        else if (s === 'c') this.copyOnly();
        else if (s === 'd') this.toggleDone();
        else if (s === 's') this.skip();
        else if (s === 'n') this.jumpNextIncomplete();
        else if (s === '/') this.enterSearch();
        else if (s === '?') this.mode = MODE.HELP;
        else if (s === 'q' || s === '\x1b') this.quit();
    }

    // ─── SEARCH MODE INPUT ───
    inputSearch(s) {
        // Escape - exit search
        if (s === '\x1b') {
            this.mode = MODE.NORMAL;
            this.searchQuery = '';
            return;
        }
        // Enter - select and exit
        if (s === '\r' || s === '\n') {
            if (this.filteredItems.length > 0) {
                const selectedItem = this.filteredItems[this.filteredIdx];
                this.idx = this.items.indexOf(selectedItem);
            }
            this.mode = MODE.NORMAL;
            this.searchQuery = '';
            return;
        }
        // Backspace
        if (s === '\x7f' || s === '\b') {
            this.searchQuery = this.searchQuery.slice(0, -1);
            this.updateFilter();
            return;
        }
        // Navigate filtered results
        if (s === '\x1b[A' || s === '\x1bOA') { // Up
            this.filteredIdx = Math.max(0, this.filteredIdx - 1);
            return;
        }
        if (s === '\x1b[B' || s === '\x1bOB') { // Down
            this.filteredIdx = Math.min(this.filteredItems.length - 1, this.filteredIdx + 1);
            return;
        }
        // Printable characters
        if (s.length === 1 && s >= ' ') {
            this.searchQuery += s;
            this.updateFilter();
        }
    }

    // ─── HELP MODE INPUT ───
    inputHelp(s) {
        // Any key exits help
        this.mode = MODE.NORMAL;
    }

    // ─── ACTIONS ───
    enterSearch() {
        this.mode = MODE.SEARCH;
        this.searchQuery = '';
        this.filteredIdx = 0;
        this.updateFilter();
    }

    updateFilter() {
        if (!this.searchQuery) {
            this.filteredItems = [...this.items];
        } else {
            this.filteredItems = this.items.filter(item => 
                fuzzyMatch(this.searchQuery, item.replace('.txt', ''))
            );
        }
        this.filteredIdx = Math.min(this.filteredIdx, Math.max(0, this.filteredItems.length - 1));
    }

    run() {
        const item = this.items[this.idx];
        if (!item) return;
        const content = getPromptContent(item);
        if (!content) return this.showToast('File not found');
        
        // Copy to clipboard
        try {
            execSync(process.platform === 'win32' ? 'clip' : 'pbcopy', { input: content });
        } catch {
            return this.showToast('Copy failed');
        }
        
        // Mark done
        const progress = getProgress();
        if (!progress.completed.includes(item)) {
            progress.completed.push(item);
            if (!progress.versions) progress.versions = {};
            progress.versions[item] = getVersion();
            saveProgress(progress);
        }
        
        // Advance to next incomplete
        this.advanceToNextIncomplete(progress, 'Copied ✓');
    }

    copyOnly() {
        const item = this.items[this.idx];
        if (!item) return;
        const content = getPromptContent(item);
        if (!content) return this.showToast('File not found');
        
        try {
            execSync(process.platform === 'win32' ? 'clip' : 'pbcopy', { input: content });
            this.showToast('Copied (not marked done)');
        } catch {
            this.showToast('Copy failed');
        }
    }

    skip() {
        const item = this.items[this.idx];
        if (!item) return;
        
        const progress = getProgress();
        if (!progress.skipped) progress.skipped = [];
        if (!progress.skipped.includes(item)) {
            progress.skipped.push(item);
            saveProgress(progress);
        }
        
        // Advance to next incomplete
        this.advanceToNextIncomplete(progress, 'Skipped');
    }

    jumpNextIncomplete() {
        const progress = getProgress();
        const nextIdx = this.items.findIndex((p, i) => i > this.idx && !progress.completed.includes(p));
        if (nextIdx >= 0) {
            this.idx = nextIdx;
            this.showToast('→ Next incomplete');
        } else {
            const firstIdx = this.items.findIndex(p => !progress.completed.includes(p));
            if (firstIdx >= 0) {
                this.idx = firstIdx;
                this.showToast('→ Wrapped to first');
            } else {
                this.showToast('All complete!');
            }
        }
    }

    advanceToNextIncomplete(progress, prefix) {
        const nextIdx = this.items.findIndex((p, i) => i > this.idx && !progress.completed.includes(p));
        if (nextIdx >= 0) {
            this.idx = nextIdx;
            this.showToast(`${prefix} → Next`);
        } else {
            const prevIdx = this.items.findIndex(p => !progress.completed.includes(p));
            if (prevIdx >= 0 && prevIdx !== this.idx) {
                this.idx = prevIdx;
                this.showToast(`${prefix} → Wrapped`);
            } else {
                this.showToast(`${prefix} All done!`);
            }
        }
    }

    toggleDone() {
        const item = this.items[this.idx];
        if (!item) return;
        const progress = getProgress();
        const i = progress.completed.indexOf(item);
        if (i === -1) {
            progress.completed.push(item);
            if (!progress.versions) progress.versions = {};
            progress.versions[item] = getVersion();
            this.showToast('Marked done');
        } else {
            progress.completed.splice(i, 1);
            if (progress.versions) delete progress.versions[item];
            this.showToast('Unmarked');
        }
        saveProgress(progress);
    }

    showToast(msg) {
        this.toast = msg;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast = '';
            this.render();
        }, 2000);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    render() {
        if (this.mode === MODE.HELP) {
            this.renderHelp();
        } else if (this.mode === MODE.SEARCH) {
            this.renderSearch();
        } else {
            this.renderNormal();
        }
    }

    renderNormal() {
        const W = this.W;
        const H = this.H;
        const progress = getProgress();
        const done = progress.completed.length;
        const total = this.items.length;
        const item = this.items[this.idx] || '';
        const isDone = progress.completed.includes(item);
        const isSkipped = progress.skipped?.includes(item);
        const content = getPromptContent(item) || '';
        const lines = content.split(/\r?\n/);
        
        const out = [];
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        // ─── Header ───
        out.push('');
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        const ver = `${fg(C.dim)}v${getVersion()}${term.reset}`;
        const branch = getBranch();
        const branchStr = branch ? `  ${fg(C.purple)}${branch}${term.reset}` : '';
        out.push(pad(`  ${title} ${ver}${branchStr}`, W));
        out.push('');

        // ─── Navigation ───
        const pos = `${this.idx + 1}/${total}`;
        const leftArr = this.idx > 0 ? `${fg(C.primary)}◀${term.reset}` : `${fg(C.dim)}◀${term.reset}`;
        const rightArr = this.idx < total - 1 ? `${fg(C.primary)}▶${term.reset}` : `${fg(C.dim)}▶${term.reset}`;
        const name = item.replace('.txt', '');
        const statusIcon = isDone ? `${fg(C.green)}●${term.reset}` : 
                          isSkipped ? `${fg(C.yellow)}○${term.reset}` : 
                          `${fg(C.muted)}○${term.reset}`;
        
        out.push(pad(`  ${leftArr}  ${fg(C.muted)}${pos}${term.reset}  ${statusIcon} ${fg(C.text)}${term.bold}${name}${term.reset}  ${rightArr}`, W));
        out.push('');

        // ─── Progress bar ───
        const barW = Math.min(60, W - 20);
        const filled = total > 0 ? Math.round((done / total) * barW) : 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const bar = `${fg(C.primary)}${'━'.repeat(filled)}${fg(C.border)}${'━'.repeat(barW - filled)}${term.reset}`;
        out.push(pad(`  ${bar}  ${fg(C.muted)}${done}/${total} (${pct}%)${term.reset}`, W));
        out.push('');

        // ─── Separator ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

        // ─── Preview ───
        const previewH = H - 14;
        const previewLines = lines.slice(0, previewH);
        
        for (let i = 0; i < previewH; i++) {
            let line = previewLines[i] || '';
            line = line.replace(/\r/g, '');
            if (line.length > W - 6) line = line.slice(0, W - 9) + '...';
            if (line.match(/^#+\s/)) {
                line = `${fg(C.purple)}${term.bold}${line}${term.reset}`;
            } else if (line.match(/^[A-Z][A-Z\s]+$/)) {
                line = `${fg(C.primary)}${term.bold}${line}${term.reset}`;
            } else if (line.startsWith('-') || line.startsWith('•')) {
                line = `${fg(C.text)}${line}${term.reset}`;
            } else {
                line = `${fg(C.muted)}${line}${term.reset}`;
            }
            out.push(pad(`  ${line}`, W));
        }

        // ─── Fill remaining space ───
        while (out.length < H - 3) out.push(pad('', W));

        // ─── Toast ───
        if (this.toast) {
            const toastLine = H - 5;
            if (out[toastLine]) {
                const toastContent = ` ${fg(C.green)}✓${term.reset}${bg(C.element)} ${fg(C.text)}${this.toast} ${term.reset}`;
                const toastLen = this.toast.length + 5;
                const rightPad = 4;
                const leftPad = W - toastLen - rightPad;
                out[toastLine] = ' '.repeat(Math.max(0, leftPad)) + `${bg(C.element)}${toastContent}` + ' '.repeat(rightPad);
            }
        }

        // ─── Footer ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        const keys = [
            `${fg(C.primary)}r${fg(C.muted)} run`,
            `${fg(C.primary)}c${fg(C.muted)} copy`,
            `${fg(C.primary)}s${fg(C.muted)} skip`,
            `${fg(C.primary)}/${fg(C.muted)} search`,
            `${fg(C.primary)}?${fg(C.muted)} help`,
        ].join(`  ${fg(C.dim)}│${term.reset}  `);
        out.push(pad(`  ${keys}${term.reset}`, W));
        out.push('');

        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }

    renderSearch() {
        const W = this.W;
        const H = this.H;
        const progress = getProgress();
        
        const out = [];
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        // ─── Header ───
        out.push('');
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        out.push(pad(`  ${title}  ${fg(C.yellow)}Search${term.reset}`, W));
        out.push('');

        // ─── Search input ───
        const searchBox = `  ${fg(C.primary)}/${term.reset} ${fg(C.text)}${this.searchQuery}${fg(C.primary)}▌${term.reset}`;
        out.push(pad(searchBox, W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

        // ─── Results ───
        const maxResults = H - 10;
        const startIdx = Math.max(0, this.filteredIdx - Math.floor(maxResults / 2));
        const visibleItems = this.filteredItems.slice(startIdx, startIdx + maxResults);

        if (this.filteredItems.length === 0) {
            out.push(pad(`  ${fg(C.muted)}No matches${term.reset}`, W));
        } else {
            out.push(pad(`  ${fg(C.dim)}${this.filteredItems.length} result(s)${term.reset}`, W));
            out.push('');
            
            visibleItems.forEach((item, i) => {
                const actualIdx = startIdx + i;
                const isSelected = actualIdx === this.filteredIdx;
                const isDone = progress.completed.includes(item);
                const name = item.replace('.txt', '');
                const icon = isDone ? `${fg(C.green)}●${term.reset}` : `${fg(C.muted)}○${term.reset}`;
                const prefix = isSelected ? `${fg(C.primary)}▸${term.reset}` : ' ';
                const label = isSelected ? `${fg(C.primary)}${name}${term.reset}` : `${fg(C.text)}${name}${term.reset}`;
                const bgStyle = isSelected ? bg(C.selected) : '';
                
                out.push(pad(`${bgStyle}  ${prefix} ${icon} ${label}${term.reset}`, W));
            });
        }

        // ─── Fill ───
        while (out.length < H - 3) out.push(pad('', W));

        // ─── Footer ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        const keys = [
            `${fg(C.primary)}↑↓${fg(C.muted)} navigate`,
            `${fg(C.primary)}Enter${fg(C.muted)} select`,
            `${fg(C.primary)}Esc${fg(C.muted)} cancel`,
        ].join(`  ${fg(C.dim)}│${term.reset}  `);
        out.push(pad(`  ${keys}${term.reset}`, W));
        out.push('');

        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }

    renderHelp() {
        const W = this.W;
        const H = this.H;
        
        const out = [];
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        const center = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            const left = Math.floor((w - stripped.length) / 2);
            return ' '.repeat(Math.max(0, left)) + s;
        };

        // ─── Header ───
        out.push('');
        out.push(pad(center(`${fg(C.primary)}${term.bold}Keyboard Shortcuts${term.reset}`, W), W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

        // ─── Help content ───
        const shortcuts = [
            ['Navigation', ''],
            ['  ← → h l', 'Previous / Next prompt'],
            ['  ↑ ↓ k j', 'Previous / Next prompt'],
            ['  Home End', 'First / Last prompt'],
            ['  n', 'Jump to next incomplete'],
            ['', ''],
            ['Actions', ''],
            ['  r  Enter', 'Run: copy + mark done + advance'],
            ['  c', 'Copy only (no mark done)'],
            ['  d', 'Toggle done / undo'],
            ['  s', 'Skip and advance'],
            ['', ''],
            ['Modes', ''],
            ['  /', 'Search prompts'],
            ['  ?', 'Show this help'],
            ['  q  Esc', 'Quit'],
        ];

        shortcuts.forEach(([key, desc]) => {
            if (!key && !desc) {
                out.push(pad('', W));
            } else if (!desc) {
                out.push(pad(`  ${fg(C.yellow)}${term.bold}${key}${term.reset}`, W));
            } else {
                out.push(pad(`  ${fg(C.primary)}${key.padEnd(12)}${term.reset}${fg(C.text)}${desc}${term.reset}`, W));
            }
        });

        // ─── Fill ───
        while (out.length < H - 3) out.push(pad('', W));

        // ─── Footer ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push(pad(`  ${fg(C.muted)}Press any key to close${term.reset}`, W));
        out.push('');

        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { TUI, InitTUI };

if (require.main === module) {
    new TUI().start();
}
