/**
 * Native readline-based prompts to replace inquirer dependency.
 * @module lib/prompts-native
 */

const readline = require('readline');

const ESC = '\x1b';
const CSI = `${ESC}[`;

const term = {
    up: (n = 1) => `${CSI}${n}A`,
    down: (n = 1) => `${CSI}${n}B`,
    clearLine: `${CSI}2K`,
    cursorTo: (col) => `${CSI}${col}G`,
    hide: `${CSI}?25l`,
    show: `${CSI}?25h`,
    bold: `${CSI}1m`,
    dim: `${CSI}2m`,
    reset: `${CSI}0m`,
    cyan: `${CSI}36m`,
    green: `${CSI}32m`,
    yellow: `${CSI}33m`,
};

/**
 * @param {string} message
 * @returns {Promise<void>}
 */
function pressEnter(message = '') {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(message, () => {
            rl.close();
            resolve();
        });
    });
}

/**
 * @param {{message: string, choices: Array, default?: any, pageSize?: number}} options
 * @returns {Promise<any>}
 */
function select({ message, choices, default: defaultValue, pageSize = 10 }) {
    return new Promise((resolve) => {
        const items = choices.filter((c) => !c.separator);
        const allChoices = choices;

        let selectedIndex = 0;
        if (defaultValue !== undefined) {
            const idx = items.findIndex((c) => c.value === defaultValue);
            if (idx >= 0) selectedIndex = idx;
        }

        let scrollOffset = 0;

        const getVisibleRange = () => {
            const totalItems = allChoices.length;
            const start = scrollOffset;
            const end = Math.min(start + pageSize, totalItems);
            return { start, end };
        };

        const render = () => {
            const { start, end } = getVisibleRange();
            const lines = [];

            lines.push(`${term.cyan}?${term.reset} ${term.bold}${message}${term.reset}`);

            let itemIndex = 0;
            for (let i = start; i < end; i++) {
                const choice = allChoices[i];
                if (choice.separator) {
                    lines.push(`${term.dim}${choice.separator}${term.reset}`);
                } else {
                    const isSelected = itemIndex === selectedIndex;
                    const prefix = isSelected ? `${term.cyan}❯${term.reset}` : ' ';
                    const text = isSelected ? `${term.cyan}${choice.name}${term.reset}` : choice.name;
                    lines.push(`${prefix} ${text}`);
                    itemIndex++;
                }
            }

            process.stdout.write(term.hide);
            lines.forEach((line) => {
                process.stdout.write(term.clearLine + line + '\n');
            });
            process.stdout.write(term.up(lines.length));
        };

        const cleanup = (linesCount) => {
            for (let i = 0; i < linesCount + 1; i++) {
                process.stdout.write(term.clearLine + term.down(1));
            }
            process.stdout.write(term.up(linesCount + 1));
            process.stdout.write(term.show);
        };

        render();

        readline.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }

        const getItemGlobalIndex = (itemIdx) => {
            let count = 0;
            for (let i = 0; i < allChoices.length; i++) {
                if (!allChoices[i].separator) {
                    if (count === itemIdx) return i;
                    count++;
                }
            }
            return 0;
        };

        const onKeypress = (_str, key) => {
            if (key.name === 'up' || key.name === 'k') {
                selectedIndex = Math.max(0, selectedIndex - 1);
                const itemsBeforeSelected = allChoices
                    .slice(0, getItemGlobalIndex(selectedIndex))
                    .filter((c) => !c.separator).length;
                if (itemsBeforeSelected < scrollOffset) {
                    scrollOffset = Math.max(0, scrollOffset - 1);
                }
                render();
            } else if (key.name === 'down' || key.name === 'j') {
                selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
                render();
            } else if (key.name === 'return') {
                process.stdin.removeListener('keypress', onKeypress);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                cleanup(pageSize + 1);
                const selected = items[selectedIndex];
                console.log(
                    `${term.cyan}?${term.reset} ${term.bold}${message}${term.reset} ${term.cyan}${selected.name}${term.reset}`
                );
                resolve(selected.value);
            } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
                process.stdin.removeListener('keypress', onKeypress);
                if (process.stdin.isTTY) {
                    process.stdin.setRawMode(false);
                }
                process.stdout.write(term.show);
                process.exit(0);
            }
        };

        process.stdin.on('keypress', onKeypress);
        process.stdin.resume();
    });
}

/**
 * @param {string} text
 * @returns {{separator: string}}
 */
function separator(text = '────────────────') {
    return { separator: text };
}

module.exports = {
    pressEnter,
    select,
    separator,
};
