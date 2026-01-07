#!/usr/bin/env node
/**
 * redpen TUI - OpenCode-inspired minimal design
 * Single-screen prompt navigator with arrow key navigation
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

// ═══════════════════════════════════════════════════════════════════════════════
// TUI
// ═══════════════════════════════════════════════════════════════════════════════
class TUI {
    constructor() {
        this.W = process.stdout.columns || 80;
        this.H = process.stdout.rows || 24;
        this.items = [];
        this.idx = 0;
        this.running = false;
        this.toast = '';
        this.toastTimer = null;
    }

    start() {
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
        
        // Ctrl+C
        if (s === '\x03') return this.quit();
        
        // Arrow keys
        if (s === '\x1b[D' || s === '\x1bOD' || s === 'h' || s === '\x1b[A' || s === '\x1bOA' || s === 'k') {
            this.idx = Math.max(0, this.idx - 1);
        } else if (s === '\x1b[C' || s === '\x1bOC' || s === 'l' || s === '\x1b[B' || s === '\x1bOB' || s === 'j') {
            this.idx = Math.min(this.items.length - 1, this.idx + 1);
        }
        // Home/End
        else if (s === '\x1b[H' || s === '\x1b[1~') this.idx = 0;
        else if (s === '\x1b[F' || s === '\x1b[4~') this.idx = this.items.length - 1;
        // Actions
        else if (s === 'r' || s === '\r' || s === '\n') this.copy();
        else if (s === 'd') this.toggleDone();
        else if (s === 'q' || s === '\x1b') this.quit();
        
        this.render();
    }

    copy() {
        const item = this.items[this.idx];
        if (!item) return;
        const content = getPromptContent(item);
        if (!content) return this.showToast('File not found');
        try {
            execSync(process.platform === 'win32' ? 'clip' : 'pbcopy', { input: content });
            this.showToast('Copied to clipboard');
        } catch {
            this.showToast('Copy failed');
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
        const W = this.W;
        const H = this.H;
        const progress = getProgress();
        const done = progress.completed.length;
        const total = this.items.length;
        const item = this.items[this.idx] || '';
        const isDone = progress.completed.includes(item);
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
        const statusIcon = isDone ? `${fg(C.green)}●${term.reset}` : `${fg(C.muted)}○${term.reset}`;
        
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
            // Truncate long lines
            if (line.length > W - 6) line = line.slice(0, W - 9) + '...';
            // Syntax highlight simple patterns
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

        // ─── Toast (RIGHT SIDE) ───
        if (this.toast) {
            const toastLine = H - 5;
            if (out[toastLine]) {
                const toastContent = ` ${fg(C.green)}✓${term.reset}${bg(C.element)} ${fg(C.text)}${this.toast} ${term.reset}`;
                const toastLen = this.toast.length + 5; // "✓ " + message + " "
                const rightPad = 4;
                const leftPad = W - toastLen - rightPad;
                out[toastLine] = ' '.repeat(Math.max(0, leftPad)) + `${bg(C.element)}${toastContent}` + ' '.repeat(rightPad);
            }
        }

        // ─── Footer ───
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        const keys = [
            `${fg(C.primary)}←→${fg(C.muted)} navigate`,
            `${fg(C.primary)}r${fg(C.muted)} copy`,
            `${fg(C.primary)}d${fg(C.muted)} ${isDone ? 'undone' : 'done'}`,
            `${fg(C.primary)}q${fg(C.muted)} quit`,
        ].join(`  ${fg(C.dim)}│${term.reset}  `);
        out.push(pad(`  ${keys}${term.reset}`, W));
        out.push('');

        // Write
        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = { TUI };

if (require.main === module) {
    new TUI().start();
}
