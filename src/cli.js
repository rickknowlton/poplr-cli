#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { generateTree } = require('./tree-generator');
const { displayLogo } = require('./utils/logo');
const configManager = require('./utils/config-manager');
const { color, colorsEnabled } = require('./utils/color');
const { escapeHtml } = require('./utils/html');
const { prompt, createInterface } = require('./utils/prompt');
const {
    optionWasPassed,
    resolveFormat,
    resolveSortBy,
    resolveRespectGitignore,
    resolveUseColors
} = require('./utils/cli-options');
const { parseCli } = require('./utils/args');
const pkg = require('../package.json');

const paint = () => color(colorsEnabled());

const FORMATS = {
    console: 'console',
    md: 'markdown',
    txt: 'ascii',
    json: 'json',
    html: 'ascii'
};

const SORT_TYPES = [
    { name: 'Name (alphabetical)', value: 'name' },
    { name: 'Directories First', value: 'directory-first' },
    { name: 'Type (directories first)', value: 'type' },
    { name: 'Size (largest first)', value: 'size' },
    { name: 'Extension', value: 'extension' }
];

const EXPORT_FORMATS = [
    { name: 'Console output only', value: 'console' },
    { name: 'Markdown file (.md)', value: 'md' },
    { name: 'Text file (.txt)', value: 'txt' },
    { name: 'JSON file (.json)', value: 'json' },
    { name: 'HTML file (.html)', value: 'html' }
];

const DEFAULT_CONFIG = {
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
        include: [],
        respectGitignore: true
    },
    export: {
        defaultFormat: 'ascii',
        outputDir: './',
        timestamp: false
    }
};

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Directory Tree</title>
    <style>
        body {
            font-family: monospace;
            padding: 20px;
            background: #f5f5f5;
        }
        pre {
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            white-space: pre-wrap;
        }
        .header {
            color: #666;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Directory Tree</h1>
        <p>Generated: {{timestamp}}</p>
    </div>
    <pre>{{content}}</pre>
</body>
</html>`;

function renderHtml(content) {
    return HTML_TEMPLATE
        .replace('{{timestamp}}', escapeHtml(new Date().toLocaleString()))
        .replace('{{content}}', escapeHtml(content));
}

async function writeOutputFile(filename, content, format) {
    try {
        switch (format) {
        case 'html':
            await fs.writeFile(`${filename}.html`, renderHtml(content));
            break;
        case 'json':
            await fs.writeFile(`${filename}.json`, JSON.stringify(content, null, 2));
            break;
        default:
            await fs.writeFile(`${filename}.${format}`, content);
        }
        console.log(paint().green(`Tree exported to ${filename}.${format}`));
    } catch (error) {
        console.error(paint().red(`Failed to write file: ${error.message}`));
        throw error;
    }
}

function treeOptionsFromConfig(userConfig, overrides) {
    const filtering = userConfig.filtering || DEFAULT_CONFIG.filtering;
    return {
        fancy: userConfig.display.fancy,
        useIcons: userConfig.display.useIcons === true,
        showStats: userConfig.display.showStats === true,
        showSize: userConfig.display.showSize === true,
        fullPath: userConfig.display.fullPath === true,
        showRoot: userConfig.display.showRoot === true,
        exclude: filtering.exclude,
        include: filtering.include,
        respectGitignore: filtering.respectGitignore !== false,
        maxDepth: filtering.maxDepth,
        fileTypes: userConfig.fileTypes,
        sortBy: resolveSortBy({ sorting: userConfig.sorting }),
        ...overrides
    };
}

/**
 * Handles the custom mode with interactive prompts
 * @param {typeof DEFAULT_CONFIG} userConfig
 */
async function handleCustomMode(userConfig = DEFAULT_CONFIG, rl) {
    await displayLogo();

    const defaults = userConfig.display || DEFAULT_CONFIG.display;
    const sortingDefaults = userConfig.sorting || DEFAULT_CONFIG.sorting;
    const exportSettings = userConfig.export || DEFAULT_CONFIG.export;

    const promptConfig = await prompt([
        {
            type: 'confirm',
            name: 'fancy',
            message: 'Use fancy characters (└──)?',
            default: defaults.fancy
        },
        {
            type: 'confirm',
            name: 'showSize',
            message: 'Show file sizes?',
            default: defaults.showSize
        },
        {
            type: 'confirm',
            name: 'showStats',
            message: 'Show directory summary?',
            default: defaults.showStats
        },
        {
            type: 'confirm',
            name: 'fullPath',
            message: 'Show full paths?',
            default: defaults.fullPath
        },
        {
            type: 'confirm',
            name: 'useIcons',
            message: 'Show file type icons?',
            default: defaults.useIcons
        },
        {
            type: 'list',
            name: 'exportFormat',
            message: 'Choose export format:',
            choices: EXPORT_FORMATS
        },
        {
            type: 'list',
            name: 'sortBy',
            message: 'Sort items by:',
            choices: SORT_TYPES,
            default: sortingDefaults.enabled === false ? 'name' : sortingDefaults.default
        }
    ], rl);

    const generatorFormat = FORMATS[promptConfig.exportFormat];
    const treeOutput = await generateTree(process.cwd(), treeOptionsFromConfig(userConfig, {
        fancy: promptConfig.fancy,
        showSize: promptConfig.showSize,
        showStats: promptConfig.showStats,
        fullPath: promptConfig.fullPath,
        useIcons: promptConfig.useIcons,
        sortBy: promptConfig.sortBy,
        useColors: resolveUseColors({
            writingFile: promptConfig.exportFormat !== 'console',
            format: generatorFormat,
            configured: defaults.useColors
        }) && colorsEnabled(),
        format: generatorFormat
    }));

    if (promptConfig.exportFormat === 'console') {
        console.log(treeOutput);
        return;
    }

    const outputDir = exportSettings.outputDir || './';
    let basename = 'tree';
    if (exportSettings.timestamp) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        basename = `tree-${timestamp}`;
    }
    await fs.mkdir(outputDir, { recursive: true });
    await writeOutputFile(path.join(outputDir, basename), treeOutput, promptConfig.exportFormat);
}

/**
 * Handles the quick tree generation with current config
 * @param {typeof DEFAULT_CONFIG} config
 */
async function handleQuickTree(config) {
    try {
        const tree = await generateTree(process.cwd(), treeOptionsFromConfig(config, {
            format: 'console',
            useColors: resolveUseColors({
                writingFile: false,
                format: 'console',
                configured: config.display.useColors
            }) && colorsEnabled()
        }));
        console.log(tree);
    } catch (error) {
        console.error(paint().red('Error generating tree:'), error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

async function runInit(options) {
    try {
        const configPath = options.global
            ? path.join(os.homedir(), '.poplrrc')
            : path.join(process.cwd(), '.poplrrc');

        await configManager.createDefaultConfig(configPath);
        console.log(paint().green(`Created configuration file at ${configPath}`));
    } catch (error) {
        console.error(paint().red('Failed to create configuration file:'), error.message);
        process.exit(1);
    }
}

async function runTree(userConfig, options) {
    try {
        const formatExplicit = optionWasPassed(process.argv, ['-f', '--format']);
        const format = resolveFormat({
            explicitFormat: formatExplicit ? options.format : null,
            outputPath: options.output,
            defaultFormat: userConfig.export.defaultFormat
        });
        const generatorFormat = format === 'html' ? 'ascii' : format;
        const depthExplicit = optionWasPassed(process.argv, ['-d', '--max-depth']);
        const maxDepth = depthExplicit ? Number(options.maxDepth) : userConfig.filtering.maxDepth;
        const sortExplicit = optionWasPassed(process.argv, ['--sort']);

        const treeOutput = await generateTree(process.cwd(), {
            fancy: userConfig.display.fancy,
            useColors: resolveUseColors({
                writingFile: Boolean(options.output),
                format: generatorFormat,
                configured: userConfig.display.useColors
            }) && colorsEnabled(),
            useIcons: userConfig.display.useIcons,
            showRoot: options.showRoot,
            showSize: options.showSize,
            fullPath: options.fullPath,
            showStats: options.stats,
            sortBy: resolveSortBy({
                explicitSort: sortExplicit ? options.sort : null,
                sorting: userConfig.sorting
            }),
            maxDepth,
            exclude: userConfig.filtering.exclude,
            include: userConfig.filtering.include,
            respectGitignore: resolveRespectGitignore({
                disabledByFlag: options.gitignore === false,
                configured: userConfig.filtering.respectGitignore
            }),
            fileTypes: userConfig.fileTypes,
            format: generatorFormat
        });

        if (options.output) {
            let fileContent;
            if (format === 'json') {
                fileContent = JSON.stringify(treeOutput, null, 2);
            } else if (format === 'html') {
                fileContent = renderHtml(treeOutput);
            } else {
                fileContent = treeOutput;
            }
            await fs.writeFile(options.output, fileContent, 'utf8');
            console.log(paint().green(`Tree written to ${options.output}`));
        } else if (format === 'json') {
            console.log(JSON.stringify(treeOutput, null, 2));
        } else {
            console.log(treeOutput);
        }
    } catch (error) {
        console.error(paint().red('Error:'), error.message);
        process.exit(1);
    }
}

/**
 * @param {typeof DEFAULT_CONFIG} userConfig
 * @returns {Promise<boolean>} true when a command, help, or version request was handled
 */
async function runCommand(userConfig) {
    const parsed = parseCli(process.argv, {
        showSize: userConfig.display.showSize,
        fullPath: userConfig.display.fullPath,
        showRoot: userConfig.display.showRoot,
        stats: userConfig.display.showStats
    });

    if (parsed.interactive) return false;
    if (parsed.helpText) {
        console.log(parsed.helpText);
        return true;
    }
    if (parsed.version) {
        console.log(pkg.version);
        return true;
    }
    if (parsed.error) {
        console.error(parsed.error);
        process.exit(1);
    }

    if (parsed.command === 'init') {
        await runInit(parsed.options);
    } else if (parsed.command === 'config') {
        console.log('Current configuration:');
        console.log(JSON.stringify(userConfig, null, 2));
    } else if (parsed.command === 'tree') await runTree(userConfig, parsed.options);

    return true;
}

async function main() {
    let userConfig;
    try {
        userConfig = await configManager.loadConfig();
    } catch (error) {
        console.warn(paint().yellow('Failed to load configuration, using defaults'));
        userConfig = DEFAULT_CONFIG;
    }

    const handled = await runCommand(userConfig);
    if (handled) return;

    if (process.argv.length === 2) {
        const rl = createInterface();
        try {
            const { mode } = await prompt([
                {
                    type: 'list',
                    name: 'mode',
                    message: 'What would you like to do?',
                    choices: [
                        { name: 'Quick tree (default settings)', value: 'quick' },
                        { name: 'Custom tree (with export options)', value: 'custom' },
                        { name: 'About poplr', value: 'about' },
                        { name: 'Exit', value: 'exit' }
                    ]
                }
            ], rl);

            switch (mode) {
            case 'quick':
                await handleQuickTree(userConfig);
                break;
            case 'custom':
                await handleCustomMode(userConfig, rl);
                break;
            case 'about':
                console.log(paint().blue('\nPoplr - A flexible and fun directory tree generator'));
                console.log('Version:', paint().green(pkg.version));
                break;
            case 'exit':
                process.exit(0);
            }
        } finally {
            rl.close();
        }
    }
}

process.on('unhandledRejection', (error) => {
    console.error(paint().red('Unhandled error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error);
    }
    process.exit(1);
});

main().catch((error) => {
    console.error(paint().red('Fatal error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error);
    }
    process.exit(1);
});
