const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DEFAULTS = {
    platform: 'web',
    frontend: 'nextjs',
    backend: 'supabase',
};

function getConfigDir() {
    const home = os.homedir();

    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'redpen');
        case 'darwin':
            return path.join(home, 'Library', 'Application Support', 'redpen');
        default:
            return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'redpen');
    }
}

function getProjectHash() {
    try {
        const remote = execSync('git config --get remote.origin.url', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
        return crypto.createHash('md5').update(remote).digest('hex').slice(0, 12);
    } catch {
        return crypto.createHash('md5').update(process.cwd()).digest('hex').slice(0, 12);
    }
}

function getProjectConfigDir() {
    const dir = path.join(getConfigDir(), 'projects', getProjectHash());
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getConfigFile() {
    return path.join(getProjectConfigDir(), 'config.json');
}

function getConfig() {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
        try {
            return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        } catch {
            return null;
        }
    }
    return null;
}

function saveConfig(config) {
    fs.writeFileSync(getConfigFile(), JSON.stringify(config, null, 2));
}

function detectStack() {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pubspecPath = path.join(process.cwd(), 'pubspec.yaml');

    if (fs.existsSync(pubspecPath)) {
        return { platform: 'mobile', framework: 'flutter' };
    }

    if (!fs.existsSync(pkgPath)) {
        return DEFAULTS;
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps['react-native']) {
            return { platform: 'mobile', framework: 'react-native' };
        }

        const detected = {
            platform: 'web',
            frontend: 'none',
            backend: 'none',
        };

        if (deps['next']) detected.frontend = 'nextjs';
        else if (deps['react']) detected.frontend = 'react';
        else if (deps['vue']) detected.frontend = 'vue';

        if (deps['@supabase/supabase-js']) detected.backend = 'supabase';
        else if (deps['firebase']) detected.backend = 'firebase';
        else if (deps['@prisma/client']) detected.backend = 'prisma';

        return detected;
    } catch {
        return DEFAULTS;
    }
}

module.exports = {
    DEFAULTS,
    getConfigDir,
    getProjectHash,
    getProjectConfigDir,
    getConfigFile,
    getConfig,
    saveConfig,
    detectStack,
};
