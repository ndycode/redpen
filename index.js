const lib = require('./lib');

module.exports = {
    getPrompt: lib.getPromptContent,
    listPrompts: lib.getRunOrder,
    getRunOrder: lib.getRunOrder,
    getConfig: lib.getConfig,
    PROMPTS_DIR: lib.PROMPTS_DIR,
    DEFAULTS: lib.DEFAULTS,
};
