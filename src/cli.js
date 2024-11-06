#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { generateTree } = require('./tree-generator');
const { displayLogo } = require('./utils/logo');
const configManager = require('./utils/config-manager');
const pkg = require('../package.json');

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
        include: ['README.md']
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

async function writeOutputFile(filename, content, format) {
    try {
        switch (format) {
        case 'html': {
            const htmlContent = HTML_TEMPLATE
                .replace('{{timestamp}}', new Date().toLocaleString())
                .replace('{{content}}', content);
            await fs.writeFile(`${filename}.html`, htmlContent);
            break;
        }
        case 'json':
            await fs.writeFile(`${filename}.json`, JSON.stringify(content, null, 2));
            break;
        default:
            await fs.writeFile(`${filename}.${format}`, content);
        }
        console.log(chalk.green(`Tree exported to ${filename}.${format}`));
    } catch (error) {
        console.error(chalk.red(`Failed to write file: ${error.message}`));
        throw error;
    }
}

/**
 * Handles the custom mode with interactive prompts
 * @param {typeof DEFAULT_CONFIG} userConfig
 */
async function handleCustomMode(userConfig = DEFAULT_CONFIG) {
    await displayLogo();

    const defaults = userConfig.display || DEFAULT_CONFIG.display;
    const sortingDefaults = userConfig.sorting || DEFAULT_CONFIG.sorting;

    const promptConfig = await inquirer.prompt([
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
            default: sortingDefaults.default
        }
    ]);

    const treeOutput = await generateTree(process.cwd(), {
        ...promptConfig,
        format: FORMATS[promptConfig.exportFormat]
    });

    if (promptConfig.exportFormat === 'console') {
        console.log(treeOutput);
    } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `tree-${timestamp}`;
        await writeOutputFile(filename, treeOutput, promptConfig.exportFormat);
    }
}

/**
 * Handles the quick tree generation with current config
 * @param {typeof DEFAULT_CONFIG} config
 */
async function handleQuickTree(config) {
    try {
        const quickConfig = {
            format: 'console',
            useIcons: config.display.useIcons === true,
            useColors: config.display.useColors === true,
            showStats: config.display.showStats === true,
            showSize: config.display.showSize === true,
            fullPath: config.display.fullPath === true,
            showRoot: config.display.showRoot === true,
            fancy: config.display.fancy !== false,
            exclude: config.filtering.exclude,
            sortBy: config.sorting.default
        };

        const tree = await generateTree(process.cwd(), quickConfig);
        console.log(tree);
    } catch (error) {
        console.error(chalk.red('Error generating tree:'), error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

/**
 * Sets up and handles CLI commands
 * @param {typeof DEFAULT_CONFIG} userConfig
 */
function setupCommands(userConfig) {
    program
        .version(pkg.version)
        .description('A flexible and fun directory tree generator');

    program
        .command('init')
        .description('Create a new .poplrrc configuration file')
        .option('-g, --global', 'Create in home directory (global)')
        .action(async (options) => {
            try {
                const configPath = options.global
                    ? path.join(os.homedir(), '.poplrrc')
                    : path.join(process.cwd(), '.poplrrc');

                await configManager.createDefaultConfig(configPath);
                console.log(chalk.green(`Created configuration file at ${configPath}`));
            } catch (error) {
                console.error(chalk.red('Failed to create configuration file:'), error.message);
                process.exit(1);
            }
        });

    program
        .command('config')
        .description('Show current configuration')
        .action(async () => {
            console.log('Current configuration:');
            console.log(JSON.stringify(userConfig, null, 2));
        });

    program
        .command('tree')
        .description('Generate a directory tree')
        .option('-f, --format <type>', 'output format (ascii, markdown)', userConfig.export.defaultFormat)
        .option('-d, --max-depth <number>', 'maximum depth to traverse', userConfig.filtering.maxDepth)
        .option('-s, --show-size', 'show file sizes', userConfig.display.showSize)
        .option('-p, --full-path', 'show full paths', userConfig.display.fullPath)
        .option('-r, --show-root', 'show root directory', userConfig.display.showRoot)
        .option('--stats', 'show directory summary', userConfig.display.showStats)
        .option('--sort <type>', 'sort by (name, type, size, extension)', userConfig.sorting.default)
        .action(async (options) => {
            try {
                const treeOutput = await generateTree(process.cwd(), {
                    ...options,
                    format: 'console',
                    exclude: userConfig.filtering.exclude
                });
                console.log(treeOutput);
            } catch (error) {
                console.error(chalk.red('Error:'), error.message);
                process.exit(1);
            }
        });
}

async function main() {
    let userConfig;
    try {
        userConfig = await configManager.loadConfig();
    } catch (error) {
        console.warn(chalk.yellow('Failed to load configuration, using defaults'));
        userConfig = DEFAULT_CONFIG;
    }

    setupCommands(userConfig);

    if (process.argv.length === 2) {
        const { mode } = await inquirer.prompt([
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
        ]);

        switch (mode) {
        case 'quick':
            await handleQuickTree(userConfig);
            break;
        case 'custom':
            await handleCustomMode(userConfig);
            break;
        case 'about':
            console.log(chalk.blue('\nPoplr - A flexible and fun directory tree generator'));
            console.log('Version:', chalk.green(pkg.version));
            break;
        case 'exit':
            process.exit(0);
        }
    } else {
        program.parse(process.argv);
    }
}

process.on('unhandledRejection', (error) => {
    console.error(chalk.red('Unhandled error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error);
    }
    process.exit(1);
});

main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error);
    }
    process.exit(1);
});
