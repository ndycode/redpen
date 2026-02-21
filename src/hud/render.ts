import { green, yellow, red, blue, gray, dim, bold } from './colors.js';
import type { HudState, HudPreset } from '../types/index.js';

const SEP = dim(' | ');

type ElementRenderer = (state: HudState) => string | null;

function ansiToTmux(ansi: string): string {
    return ansi
        .replace(new RegExp('\\x1b\\[38;5;(\\d+)m', 'g'), '#[fg=colour$1]')
        .replace(new RegExp('\\x1b\\[48;5;(\\d+)m', 'g'), '#[bg=colour$1]')
        .replace(new RegExp('\\x1b\\[1m', 'g'), '#[bold]')
        .replace(new RegExp('\\x1b\\[2m', 'g'), '#[dim]')
        .replace(new RegExp('\\x1b\\[0m', 'g'), '#[default]');
}

function renderMode(state: HudState): string | null {
    if (!state.mode) return null;
    return bold(state.mode);
}

function renderProgress(state: HudState): string | null {
    if (state.progress === undefined || state.progress === null) return null;

    const pct = Math.min(100, Math.max(0, state.progress));
    const width = 10;
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;

    let colorFn = red;
    if (pct > 80) colorFn = green;
    else if (pct > 40) colorFn = yellow;

    const bar = colorFn('█'.repeat(filled)) + gray('░'.repeat(empty));
    return `[${bar}] ${colorFn(`${pct}%`)}`;
}

function renderPhase(state: HudState): string | null {
    if (!state.phase) return null;

    const p = state.phase.toLowerCase();
    let coloredPhase = state.phase;

    if (p === 'planning') coloredPhase = blue(state.phase);
    else if (p === 'execution' || p === 'executing') coloredPhase = yellow(state.phase);
    else if (p === 'review' || p === 'reviewing') coloredPhase = green(state.phase);
    else if (p === 'teardown') coloredPhase = red(state.phase);

    return coloredPhase;
}

function renderTask(state: HudState): string | null {
    if (!state.currentTask) return null;
    return state.currentTask;
}

function renderTeamName(state: HudState): string | null {
    if (!state.teamName) return null;
    return `Team: ${state.teamName}`;
}

function renderWorkerCount(state: HudState): string | null {
    if (state.workerCount === undefined || state.workerCount === null) return null;
    const total = state.totalWorkers ?? state.workerCount;
    return `👷 ${state.workerCount}/${total}`;
}

function renderTimestamp(state: HudState): string | null {
    if (!state.lastUpdate) return null;
    const date = new Date(state.lastUpdate);
    return dim(date.toLocaleTimeString());
}

const MINIMAL_ELEMENTS: ElementRenderer[] = [renderMode, renderProgress];
const FOCUSED_ELEMENTS: ElementRenderer[] = [renderMode, renderPhase, renderTask, renderProgress, renderWorkerCount];
const FULL_ELEMENTS: ElementRenderer[] = [
    renderMode,
    renderPhase,
    renderTask,
    renderTeamName,
    renderWorkerCount,
    renderProgress,
    renderTimestamp,
];

function getElements(preset: HudPreset | string): ElementRenderer[] {
    switch (preset) {
        case 'minimal':
            return MINIMAL_ELEMENTS;
        case 'focused':
            return FOCUSED_ELEMENTS;
        case 'full':
            return FULL_ELEMENTS;
        default:
            return FOCUSED_ELEMENTS;
    }
}

export function renderHud(state: HudState, preset: HudPreset | string): string {
    const elements = getElements(preset);
    const parts = elements.map((fn) => fn(state)).filter((s): s is string => s !== null && s !== '');

    const label = bold('[redpen]');

    if (parts.length === 0) {
        return label + ' ' + dim('No active modes.');
    }

    return label + ' ' + parts.join(SEP);
}

export function renderTmux(state: HudState, preset: HudPreset | string): string {
    return ansiToTmux(renderHud(state, preset));
}
