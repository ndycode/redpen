const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getProjectConfigDir } = require('./config');
const { getVersion } = require('./utils');

function getBranch() {
    try {
        return execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch {
        return null;
    }
}

function getProgressFile() {
    const branch = getBranch();
    const filename = branch ? `progress-${branch.replace(/[^a-zA-Z0-9-]/g, '-')}.json` : 'progress.json';
    return path.join(getProjectConfigDir(), filename);
}

function getProgress() {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        try {
            return JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
        } catch {
            return { completed: [] };
        }
    }
    return { completed: [] };
}

function saveProgress(progress) {
    fs.writeFileSync(getProgressFile(), JSON.stringify(progress, null, 2));
}

function markDone(promptPath) {
    const progress = getProgress();
    if (!progress.completed.includes(promptPath)) {
        progress.completed.push(promptPath);
        if (!progress.versions) progress.versions = {};
        progress.versions[promptPath] = getVersion();
        saveProgress(progress);
    }
    return progress;
}

function markSkipped(promptPath) {
    const progress = getProgress();
    if (!progress.skipped) progress.skipped = [];
    if (!progress.skipped.includes(promptPath)) {
        progress.skipped.push(promptPath);
        saveProgress(progress);
    }
    return progress;
}

function undoLast() {
    const progress = getProgress();
    if (progress.completed.length === 0) {
        return null;
    }
    const last = progress.completed.pop();
    if (progress.versions) delete progress.versions[last];
    saveProgress(progress);
    return last;
}

function resetProgress() {
    const progressFile = getProgressFile();
    if (fs.existsSync(progressFile)) {
        fs.unlinkSync(progressFile);
    }
}

module.exports = {
    getBranch,
    getProgressFile,
    getProgress,
    saveProgress,
    markDone,
    markSkipped,
    undoLast,
    resetProgress,
};
