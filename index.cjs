const lib = require('./lib/index.cjs');

module.exports = {
    getPrompt: lib.getPromptContent,
    listPrompts: lib.getRunOrder,
    getRunOrder: lib.getRunOrder,
    getConfig: lib.getConfig,
    PROMPTS_DIR: lib.PROMPTS_DIR,
    DEFAULTS: lib.DEFAULTS,
};
