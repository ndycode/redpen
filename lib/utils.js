const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getVersion() {
    try {
        const pkgPath = path.join(__dirname, '..', 'package.json');
        return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version;
    } catch {
        return '0.0.0';
    }
}

function copyToClipboard(text) {
    try {
        execSync(process.platform === 'win32' ? 'clip' : 'pbcopy', { input: text });
        return true;
    } catch {
        return false;
    }
}

function fuzzyMatch(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti++) {
        if (text[ti] === query[qi]) qi++;
    }
    return qi === query.length;
}

const colors = {
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
    reset: '\x1b[0m',
};

module.exports = {
    getVersion,
    copyToClipboard,
    fuzzyMatch,
    colors,
};
