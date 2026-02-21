const NO_COLOR = process.env['NO_COLOR'] !== undefined;

const ESC = '\x1b[';

const RESET = NO_COLOR ? '' : `${ESC}0m`;

function ansi256fg(code: number): string {
    return NO_COLOR ? '' : `${ESC}38;5;${code}m`;
}

function ansi256bg(code: number): string {
    return NO_COLOR ? '' : `${ESC}48;5;${code}m`;
}

const BOLD_ON = NO_COLOR ? '' : `${ESC}1m`;
const DIM_ON = NO_COLOR ? '' : `${ESC}2m`;

export const COLOR = {
    RESET,

    BOLD_ON,
    DIM_ON,

    FG: {
        GREEN: ansi256fg(82),
        YELLOW: ansi256fg(220),
        RED: ansi256fg(196),
        CYAN: ansi256fg(87),
        BLUE: ansi256fg(33),
        MAGENTA: ansi256fg(171),
        WHITE: ansi256fg(255),
        GRAY: ansi256fg(244),
        DARK_GRAY: ansi256fg(238),
        ORANGE: ansi256fg(214),
        LIME: ansi256fg(154),
        TEAL: ansi256fg(37),
    },

    BG: {
        GREEN: ansi256bg(28),
        YELLOW: ansi256bg(184),
        RED: ansi256bg(124),
        BLUE: ansi256bg(18),
        DARK: ansi256bg(235),
        DARKER: ansi256bg(232),
    },

    PHASE: {
        PLANNING: ansi256fg(33),
        EXECUTING: ansi256fg(82),
        REVIEWING: ansi256fg(220),
        DONE: ansi256fg(244),
        ERROR: ansi256fg(196),
    },

    STATUS: {
        ACTIVE: ansi256fg(82),
        IDLE: ansi256fg(244),
        WARNING: ansi256fg(220),
        CRITICAL: ansi256fg(196),
        UNKNOWN: ansi256fg(238),
    },

    PROGRESS: {
        LOW: ansi256fg(82),
        MID: ansi256fg(220),
        HIGH: ansi256fg(196),
        FILL: ansi256fg(82),
        EMPTY: ansi256fg(238),
    },

    LABEL: {
        KEY: ansi256fg(244),
        VALUE: ansi256fg(255),
        MUTED: ansi256fg(238),
        ACCENT: ansi256fg(87),
    },
} as const;

export type ColorName = keyof typeof COLOR.FG;

function wrap(code: string, text: string): string {
    if (NO_COLOR) return text;
    return `${code}${text}${RESET}`;
}

export function green(text: string): string {
    return wrap(COLOR.FG.GREEN, text);
}
export function yellow(text: string): string {
    return wrap(COLOR.FG.YELLOW, text);
}
export function red(text: string): string {
    return wrap(COLOR.FG.RED, text);
}
export function cyan(text: string): string {
    return wrap(COLOR.FG.CYAN, text);
}
export function blue(text: string): string {
    return wrap(COLOR.FG.BLUE, text);
}
export function magenta(text: string): string {
    return wrap(COLOR.FG.MAGENTA, text);
}
export function gray(text: string): string {
    return wrap(COLOR.FG.GRAY, text);
}
export function orange(text: string): string {
    return wrap(COLOR.FG.ORANGE, text);
}
export function dim(text: string): string {
    return wrap(DIM_ON, text);
}
export function bold(text: string): string {
    return wrap(BOLD_ON, text);
}

export function phaseColor(phase: string): string {
    const p = phase.toLowerCase();
    if (p === 'planning') return COLOR.PHASE.PLANNING;
    if (p === 'executing') return COLOR.PHASE.EXECUTING;
    if (p === 'reviewing') return COLOR.PHASE.REVIEWING;
    if (p === 'done') return COLOR.PHASE.DONE;
    if (p === 'error') return COLOR.PHASE.ERROR;
    return COLOR.PHASE.EXECUTING;
}

export function colorPhase(phase: string): string {
    return wrap(phaseColor(phase), phase);
}

export function progressColor(pct: number): string {
    if (pct >= 85) return COLOR.PROGRESS.HIGH;
    if (pct >= 50) return COLOR.PROGRESS.MID;
    return COLOR.PROGRESS.LOW;
}

export function progressBar(pct: number, width = 10): string {
    const safeWidth = Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
    const safePct = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
    const filled = Math.round((safePct / 100) * safeWidth);
    const empty = safeWidth - filled;
    const fillColor = progressColor(safePct);
    const emptyCode = NO_COLOR ? '' : COLOR.PROGRESS.EMPTY;
    return `${fillColor}${'█'.repeat(filled)}${emptyCode}${'░'.repeat(empty)}${RESET}`;
}

export function workerCountColor(active: number, total: number): string {
    if (total === 0) return COLOR.STATUS.IDLE;
    const ratio = active / total;
    if (ratio >= 0.8) return COLOR.STATUS.ACTIVE;
    if (ratio >= 0.4) return COLOR.STATUS.WARNING;
    return COLOR.STATUS.IDLE;
}

export function colorWorkerCount(active: number, total: number): string {
    return wrap(workerCountColor(active, total), `${active}/${total}`);
}

export function noColor(): boolean {
    return NO_COLOR;
}
