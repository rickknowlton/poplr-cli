// src/utils/config-manager.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ConfigManager {
    constructor() {
        this.defaultConfig = {
            display: {
                fancy: true,
                useIcons: false,
                useColors: true,
                showSize: false,
                showStats: false,
                showRoot: false,
                fullPath: false
            },
            sorting: {
                enabled: true,
                default: 'directory-first'
            },
            filtering: {
                maxDepth: null,
                exclude: ['node_modules', '.git', '.DS_Store'],
                include: ['README.md']
            },
            export: {
                defaultFormat: 'ascii',
                outputDir: './',
                timestamp: false
            },
            fileTypes: {
                image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
                video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
                audio: ['.mp3', '.wav', '.ogg', '.m4a'],
                archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
                pdf: ['.pdf'],
                code: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json', '.xml']
            }
        };
    }

    async loadConfig() {
        const configs = await Promise.all([
            this.loadGlobalConfig(),
            this.loadLocalConfig()
        ]);

        return this.mergeConfigs(
            this.defaultConfig,
            configs[0] || {},
            configs[1] || {}
        );
    }

    async loadGlobalConfig() {
        try {
            const globalConfigPath = path.join(os.homedir(), '.poplrrc');
            const content = await fs.readFile(globalConfigPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    async loadLocalConfig() {
        try {
            const localConfigPath = path.join(process.cwd(), '.poplrrc');
            const content = await fs.readFile(localConfigPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    mergeConfigs(...configs) {
        return configs.reduce((merged, config) => {
            return this.deepMerge(merged, config);
        }, {});
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] instanceof Object && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    async createDefaultConfig(path) {
        const content = JSON.stringify(this.defaultConfig, null, 2);
        await fs.writeFile(path, content, 'utf8');
        return this.defaultConfig;
    }

    toCliOptions(config) {
        return {
            fancy: config.display.fancy,
            useIcons: config.display.useIcons,
            useColors: config.display.useColors,
            showSize: config.display.showSize,
            showStats: config.display.showStats,
            showRoot: config.display.showRoot,
            fullPath: config.display.fullPath,
            sortBy: config.sorting.enabled ? config.sorting.default : null,
            maxDepth: config.filtering.maxDepth,
            exclude: config.filtering.exclude,
            format: config.export.defaultFormat
        };
    }
}

module.exports = new ConfigManager();
