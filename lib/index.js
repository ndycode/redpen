const config = require('./config');
const progress = require('./progress');
const prompts = require('./prompts');
const utils = require('./utils');
const promptsNative = require('./prompts-native');

module.exports = {
    DEFAULTS: config.DEFAULTS,
    getConfigDir: config.getConfigDir,
    getProjectHash: config.getProjectHash,
    getProjectConfigDir: config.getProjectConfigDir,
    getConfigFile: config.getConfigFile,
    getConfig: config.getConfig,
    saveConfig: config.saveConfig,
    detectStack: config.detectStack,

    getBranch: progress.getBranch,
    getProgressFile: progress.getProgressFile,
    getProgress: progress.getProgress,
    saveProgress: progress.saveProgress,
    markDone: progress.markDone,
    markSkipped: progress.markSkipped,
    undoLast: progress.undoLast,
    resetProgress: progress.resetProgress,

    PROMPTS_DIR: prompts.PROMPTS_DIR,
    CUSTOM_DIR: prompts.CUSTOM_DIR,
    scanDir: prompts.scanDir,
    scanDirRecursive: prompts.scanDirRecursive,
    buildRunOrder: prompts.buildRunOrder,
    getRunOrder: prompts.getRunOrder,
    getPromptContent: prompts.getPromptContent,
    getPromptFullPath: prompts.getPromptFullPath,
    resolvePrompt: prompts.resolvePrompt,
    getPromptName: prompts.getPromptName,
    getPromptCategory: prompts.getPromptCategory,

    getVersion: utils.getVersion,
    copyToClipboard: utils.copyToClipboard,
    fuzzyMatch: utils.fuzzyMatch,
    colors: utils.colors,

    pressEnter: promptsNative.pressEnter,
    select: promptsNative.select,
    separator: promptsNative.separator,
};
