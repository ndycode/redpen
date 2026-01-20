#!/usr/bin/env node

const lib = require('../lib');

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

const C = {
    base: [24, 24, 24],
    panel: [20, 20, 20],
    element: [38, 38, 38],
    selected: [50, 35, 40],
    border: [50, 50, 50],
    borderAct: [227, 70, 113],
    text: [228, 228, 228],
    muted: [140, 140, 140],
    dim: [90, 90, 90],
    primary: [227, 70, 113],
    primaryBr: [252, 107, 131],
    green: [63, 162, 102],
    greenBr: [112, 180, 137],
    yellow: [241, 180, 103],
    orange: [210, 148, 62],
    cyan: [136, 192, 208],
    blue: [129, 161, 193],
    pink: [227, 148, 220],
    purple: [170, 160, 250],
    teal: [130, 210, 206],
};

const fg = (c) => term.fg(c[0], c[1], c[2]);
const bg = (c) => term.bg(c[0], c[1], c[2]);

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

const INIT_STEPS = {
    PLATFORM: 'platform',
    FRONTEND: 'frontend',
    BACKEND: 'backend',
    FRAMEWORK: 'framework',
    CONFIRM: 'confirm',
};

const MODE = {
    NORMAL: 'normal',
    SEARCH: 'search',
    HELP: 'help',
};

class InitTUI {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.W = process.stdout.columns || 80;
        this.H = process.stdout.rows || 24;
        this.running = false;
        this.step = INIT_STEPS.PLATFORM;
        this.selectedIdx = 0;
        this.config = lib.detectStack();
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
        this.inputHandler = (d) => this.input(d);
        process.stdin.on('data', this.inputHandler);

        process.on('SIGINT', () => this.quit());
        process.on('SIGWINCH', () => {
            this.W = process.stdout.columns || 80;
            this.H = process.stdout.rows || 24;
            this.render();
        });

        this.preselectDetected();
        this.render();
    }

    preselectDetected() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM:
                this.selectedIdx = PLATFORMS.findIndex((p) => p.id === this.detectedPlatform);
                break;
            case INIT_STEPS.FRONTEND:
                this.selectedIdx = FRONTENDS.findIndex((f) => f.id === this.detectedFrontend);
                break;
            case INIT_STEPS.BACKEND:
                this.selectedIdx = BACKENDS.findIndex((b) => b.id === this.detectedBackend);
                break;
            case INIT_STEPS.FRAMEWORK:
                this.selectedIdx = FRAMEWORKS.findIndex((f) => f.id === this.detectedFramework);
                break;
        }
        if (this.selectedIdx < 0) this.selectedIdx = 0;
    }

    getCurrentOptions() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM:
                return PLATFORMS;
            case INIT_STEPS.FRONTEND:
                return FRONTENDS;
            case INIT_STEPS.BACKEND:
                return BACKENDS;
            case INIT_STEPS.FRAMEWORK:
                return FRAMEWORKS;
            default:
                return [];
        }
    }

    getStepTitle() {
        switch (this.step) {
            case INIT_STEPS.PLATFORM:
                return 'Select Platform';
            case INIT_STEPS.FRONTEND:
                return 'Select Frontend';
            case INIT_STEPS.BACKEND:
                return 'Select Backend';
            case INIT_STEPS.FRAMEWORK:
                return 'Select Framework';
            case INIT_STEPS.CONFIRM:
                return 'Confirm Configuration';
            default:
                return '';
        }
    }

    getStepNumber() {
        if (this.config.platform === 'web') {
            switch (this.step) {
                case INIT_STEPS.PLATFORM:
                    return [1, 3];
                case INIT_STEPS.FRONTEND:
                    return [2, 3];
                case INIT_STEPS.BACKEND:
                    return [3, 3];
                case INIT_STEPS.CONFIRM:
                    return [3, 3];
            }
        } else {
            switch (this.step) {
                case INIT_STEPS.PLATFORM:
                    return [1, 2];
                case INIT_STEPS.FRAMEWORK:
                    return [2, 2];
                case INIT_STEPS.CONFIRM:
                    return [2, 2];
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

        if (s === '\x03') return this.quit();
        if (s.startsWith('\x1b[M') || s.startsWith('\x1b[<') || s.startsWith('\x1b[3')) return;

        const options = this.getCurrentOptions();

        if (this.step === INIT_STEPS.CONFIRM) {
            if (s === '\r' || s === '\n' || s === 'y' || s === 'Y') {
                this.finish();
                return;
            }
            if (s === 'n' || s === 'N' || s === '\x1b') {
                this.step = INIT_STEPS.PLATFORM;
                this.preselectDetected();
            }
        } else {
            if (s === '\x1b[A' || s === '\x1bOA' || s === 'k') {
                this.selectedIdx = Math.max(0, this.selectedIdx - 1);
            } else if (s === '\x1b[B' || s === '\x1bOB' || s === 'j') {
                this.selectedIdx = Math.min(options.length - 1, this.selectedIdx + 1);
            } else if (s === '\r' || s === '\n' || s === ' ') {
                this.select();
            } else if (s === '\x1b') {
                this.goBack();
            } else if (s >= '1' && s <= '9') {
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
        lib.saveConfig(this.config);
        this.running = false;
        process.stdin.removeListener('data', this.inputHandler);
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

        out.push('');
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        const ver = `${fg(C.dim)}v${lib.getVersion()}${term.reset}`;
        out.push(pad(`  ${title} ${ver}  ${fg(C.yellow)}Setup${term.reset}`, W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

        const [stepNum, totalSteps] = this.getStepNumber();
        const stepTitle = this.getStepTitle();
        const stepIndicator = `${fg(C.muted)}Step ${stepNum}/${totalSteps}${term.reset}`;
        out.push(pad(`  ${stepIndicator}  ${fg(C.text)}${term.bold}${stepTitle}${term.reset}`, W));
        out.push('');

        if (this.step === INIT_STEPS.CONFIRM) {
            out.push(pad(`  ${fg(C.muted)}Your configuration:${term.reset}`, W));
            out.push('');

            out.push(
                pad(`    ${fg(C.cyan)}Platform${term.reset}    ${fg(C.text)}${this.config.platform}${term.reset}`, W)
            );

            if (this.config.platform === 'web') {
                const frontendLabel =
                    FRONTENDS.find((f) => f.id === this.config.frontend)?.label || this.config.frontend;
                const backendLabel = BACKENDS.find((b) => b.id === this.config.backend)?.label || this.config.backend;
                out.push(
                    pad(`    ${fg(C.cyan)}Frontend${term.reset}    ${fg(C.text)}${frontendLabel}${term.reset}`, W)
                );
                out.push(pad(`    ${fg(C.cyan)}Backend${term.reset}     ${fg(C.text)}${backendLabel}${term.reset}`, W));
            } else {
                const frameworkLabel =
                    FRAMEWORKS.find((f) => f.id === this.config.framework)?.label || this.config.framework;
                out.push(
                    pad(`    ${fg(C.cyan)}Framework${term.reset}   ${fg(C.text)}${frameworkLabel}${term.reset}`, W)
                );
            }

            out.push('');

            lib.saveConfig(this.config);
            const prompts = lib.getRunOrder();
            out.push(
                pad(
                    `    ${fg(C.green)}${prompts.length}${term.reset} ${fg(C.muted)}prompts will be loaded${term.reset}`,
                    W
                )
            );

            out.push('');
            out.push(pad(`  ${fg(C.muted)}Config: ${fg(C.text)}${lib.getConfigFile()}${term.reset}`, W));
            out.push('');
        } else {
            const options = this.getCurrentOptions();

            const detected =
                this.step === INIT_STEPS.PLATFORM
                    ? this.detectedPlatform
                    : this.step === INIT_STEPS.FRONTEND
                      ? this.detectedFrontend
                      : this.step === INIT_STEPS.BACKEND
                        ? this.detectedBackend
                        : this.step === INIT_STEPS.FRAMEWORK
                          ? this.detectedFramework
                          : null;

            if (detected && detected !== 'none') {
                out.push(pad(`  ${fg(C.dim)}detected: ${detected}${term.reset}`, W));
                out.push('');
            }

            options.forEach((opt, i) => {
                const isSelected = i === this.selectedIdx;
                const isDetected = opt.id === detected;

                const num = `${fg(C.dim)}${i + 1}${term.reset}`;
                const bullet = isSelected ? `${fg(C.primary)}▸${term.reset}` : ' ';
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

        while (out.length < H - 4) out.push(pad('', W));

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

        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }
}

class TUI {
    constructor() {
        this.W = process.stdout.columns || 80;
        this.H = process.stdout.rows || 24;
        this.items = [];
        this.idx = 0;
        this.running = false;
        this.toast = '';
        this.toastTimer = null;
        this.mode = MODE.NORMAL;
        this.searchQuery = '';
        this.filteredItems = [];
        this.filteredIdx = 0;
    }

    start() {
        const config = lib.getConfig();
        if (!config) {
            const initTUI = new InitTUI((_savedConfig) => {
                this.startMain();
            });
            initTUI.start();
            return;
        }

        this.startMain();
    }

    startMain() {
        this.running = true;
        this.items = lib.getRunOrder();

        const progress = lib.getProgress();
        const firstIncomplete = this.items.findIndex((p) => !progress.completed.includes(p));
        this.idx = firstIncomplete >= 0 ? firstIncomplete : 0;

        process.stdout.write(term.alt + term.hide);

        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.setEncoding('utf8');
        process.stdin.resume();

        process.stdin.removeAllListeners('data');
        process.stdin.on('data', (d) => this.input(d));

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

        if (s === '\x03') return this.quit();
        if (s.startsWith('\x1b[M') || s.startsWith('\x1b[<') || s.startsWith('\x1b[3')) return;

        if (this.mode === MODE.HELP) {
            this.inputHelp(s);
        } else if (this.mode === MODE.SEARCH) {
            this.inputSearch(s);
        } else {
            this.inputNormal(s);
        }

        this.render();
    }

    inputNormal(s) {
        if (s === '\x1b[D' || s === '\x1bOD' || s === 'h' || s === '\x1b[A' || s === '\x1bOA' || s === 'k') {
            this.idx = Math.max(0, this.idx - 1);
        } else if (s === '\x1b[C' || s === '\x1bOC' || s === 'l' || s === '\x1b[B' || s === '\x1bOB' || s === 'j') {
            this.idx = Math.min(this.items.length - 1, this.idx + 1);
        } else if (s === '\x1b[H' || s === '\x1b[1~') this.idx = 0;
        else if (s === '\x1b[F' || s === '\x1b[4~') this.idx = this.items.length - 1;
        else if (s === 'r' || s === '\r' || s === '\n') this.run();
        else if (s === 'c') this.copyOnly();
        else if (s === 'd') this.toggleDone();
        else if (s === 's') this.skip();
        else if (s === 'n') this.jumpNextIncomplete();
        else if (s === '/') this.enterSearch();
        else if (s === '?') this.mode = MODE.HELP;
        else if (s === 'q' || s === '\x1b') this.quit();
    }

    inputSearch(s) {
        if (s === '\x1b') {
            this.mode = MODE.NORMAL;
            this.searchQuery = '';
            return;
        }
        if (s === '\r' || s === '\n') {
            if (this.filteredItems.length > 0) {
                const selectedItem = this.filteredItems[this.filteredIdx];
                this.idx = this.items.indexOf(selectedItem);
            }
            this.mode = MODE.NORMAL;
            this.searchQuery = '';
            return;
        }
        if (s === '\x7f' || s === '\b') {
            this.searchQuery = this.searchQuery.slice(0, -1);
            this.updateFilter();
            return;
        }
        if (s === '\x1b[A' || s === '\x1bOA') {
            this.filteredIdx = Math.max(0, this.filteredIdx - 1);
            return;
        }
        if (s === '\x1b[B' || s === '\x1bOB') {
            this.filteredIdx = Math.min(this.filteredItems.length - 1, this.filteredIdx + 1);
            return;
        }
        if (s.length === 1 && s >= ' ') {
            this.searchQuery += s;
            this.updateFilter();
        }
    }

    inputHelp(_s) {
        this.mode = MODE.NORMAL;
    }

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
            this.filteredItems = this.items.filter((item) => lib.fuzzyMatch(this.searchQuery, lib.getPromptName(item)));
        }
        this.filteredIdx = Math.min(this.filteredIdx, Math.max(0, this.filteredItems.length - 1));
    }

    run() {
        const item = this.items[this.idx];
        if (!item) return;
        const content = lib.getPromptContent(item);
        if (!content) return this.showToast('File not found');

        if (!lib.copyToClipboard(content)) {
            return this.showToast('Copy failed');
        }

        lib.markDone(item);
        this.advanceToNextIncomplete(lib.getProgress(), 'Copied ✓');
    }

    copyOnly() {
        const item = this.items[this.idx];
        if (!item) return;
        const content = lib.getPromptContent(item);
        if (!content) return this.showToast('File not found');

        if (lib.copyToClipboard(content)) {
            this.showToast('Copied (not marked done)');
        } else {
            this.showToast('Copy failed');
        }
    }

    skip() {
        const item = this.items[this.idx];
        if (!item) return;

        lib.markSkipped(item);
        this.advanceToNextIncomplete(lib.getProgress(), 'Skipped');
    }

    jumpNextIncomplete() {
        const progress = lib.getProgress();
        const nextIdx = this.items.findIndex((p, i) => i > this.idx && !progress.completed.includes(p));
        if (nextIdx >= 0) {
            this.idx = nextIdx;
            this.showToast('→ Next incomplete');
        } else {
            const firstIdx = this.items.findIndex((p) => !progress.completed.includes(p));
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
            const prevIdx = this.items.findIndex((p) => !progress.completed.includes(p));
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
        const progress = lib.getProgress();
        const i = progress.completed.indexOf(item);
        if (i === -1) {
            lib.markDone(item);
            this.showToast('Marked done');
        } else {
            progress.completed.splice(i, 1);
            if (progress.versions) delete progress.versions[item];
            lib.saveProgress(progress);
            this.showToast('Unmarked');
        }
    }

    showToast(msg) {
        this.toast = msg;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            this.toast = '';
            this.render();
        }, 2000);
    }

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
        const progress = lib.getProgress();
        const done = progress.completed.length;
        const total = this.items.length;
        const item = this.items[this.idx] || '';
        const isDone = progress.completed.includes(item);
        const isSkipped = progress.skipped?.includes(item);
        const content = lib.getPromptContent(item) || '';
        const lines = content.split(/\r?\n/);

        const out = [];
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        out.push('');
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        const ver = `${fg(C.dim)}v${lib.getVersion()}${term.reset}`;
        const branch = lib.getBranch();
        const branchStr = branch ? `  ${fg(C.purple)}${branch}${term.reset}` : '';
        out.push(pad(`  ${title} ${ver}${branchStr}`, W));
        out.push('');

        const pos = `${this.idx + 1}/${total}`;
        const leftArr = this.idx > 0 ? `${fg(C.primary)}◀${term.reset}` : `${fg(C.dim)}◀${term.reset}`;
        const rightArr = this.idx < total - 1 ? `${fg(C.primary)}▶${term.reset}` : `${fg(C.dim)}▶${term.reset}`;
        const name = lib.getPromptName(item);
        const statusIcon = isDone
            ? `${fg(C.green)}●${term.reset}`
            : isSkipped
              ? `${fg(C.yellow)}○${term.reset}`
              : `${fg(C.muted)}○${term.reset}`;

        out.push(
            pad(
                `  ${leftArr}  ${fg(C.muted)}${pos}${term.reset}  ${statusIcon} ${fg(C.text)}${term.bold}${name}${term.reset}  ${rightArr}`,
                W
            )
        );
        out.push('');

        const barW = Math.min(60, W - 20);
        const filled = total > 0 ? Math.round((done / total) * barW) : 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const bar = `${fg(C.primary)}${'━'.repeat(filled)}${fg(C.border)}${'━'.repeat(barW - filled)}${term.reset}`;
        out.push(pad(`  ${bar}  ${fg(C.muted)}${done}/${total} (${pct}%)${term.reset}`, W));
        out.push('');

        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

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

        while (out.length < H - 3) out.push(pad('', W));

        if (this.toast) {
            const toastLine = H - 5;
            if (out[toastLine]) {
                const toastContent = ` ${fg(C.green)}✓${term.reset}${bg(C.element)} ${fg(C.text)}${this.toast} ${term.reset}`;
                const toastLen = this.toast.length + 5;
                const rightPad = 4;
                const leftPad = W - toastLen - rightPad;
                out[toastLine] =
                    ' '.repeat(Math.max(0, leftPad)) + `${bg(C.element)}${toastContent}` + ' '.repeat(rightPad);
            }
        }

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
        const progress = lib.getProgress();

        const out = [];
        const pad = (s, w) => {
            const stripped = s.replace(/\x1b\[[0-9;]*m/g, '');
            return s + ' '.repeat(Math.max(0, w - stripped.length));
        };

        out.push('');
        const title = `${fg(C.primary)}${term.bold}red${fg(C.text)}pen${term.reset}`;
        out.push(pad(`  ${title}  ${fg(C.yellow)}Search${term.reset}`, W));
        out.push('');

        const searchBox = `  ${fg(C.primary)}/${term.reset} ${fg(C.text)}${this.searchQuery}${fg(C.primary)}▌${term.reset}`;
        out.push(pad(searchBox, W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

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
                const name = lib.getPromptName(item);
                const icon = isDone ? `${fg(C.green)}●${term.reset}` : `${fg(C.muted)}○${term.reset}`;
                const prefix = isSelected ? `${fg(C.primary)}▸${term.reset}` : ' ';
                const label = isSelected ? `${fg(C.primary)}${name}${term.reset}` : `${fg(C.text)}${name}${term.reset}`;
                const bgStyle = isSelected ? bg(C.selected) : '';

                out.push(pad(`${bgStyle}  ${prefix} ${icon} ${label}${term.reset}`, W));
            });
        }

        while (out.length < H - 3) out.push(pad('', W));

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

        out.push('');
        out.push(pad(center(`${fg(C.primary)}${term.bold}Keyboard Shortcuts${term.reset}`, W), W));
        out.push('');
        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push('');

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

        while (out.length < H - 3) out.push(pad('', W));

        out.push(pad(`  ${fg(C.border)}${'─'.repeat(W - 4)}${term.reset}`, W));
        out.push(pad(`  ${fg(C.muted)}Press any key to close${term.reset}`, W));
        out.push('');

        process.stdout.write(term.home + out.slice(0, H).join('\n'));
    }
}

module.exports = { TUI, InitTUI };

if (require.main === module) {
    new TUI().start();
}
