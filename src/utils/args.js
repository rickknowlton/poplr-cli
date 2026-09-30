const path = require('path');

const COMMANDS = {
    init: {
        description: 'Create a new .poplrrc configuration file',
        options: [
            {
                names: ['-g', '--global'],
                key: 'global',
                label: '-g, --global',
                description: 'Create in home directory (global)'
            }
        ]
    },
    config: {
        description: 'Show current configuration',
        options: []
    },
    tree: {
        description: 'Generate a directory tree',
        options: [
            {
                names: ['-f', '--format'],
                key: 'format',
                value: true,
                label: '-f, --format <type>',
                description: 'output format (ascii, markdown, json, html)'
            },
            {
                names: ['-o', '--output'],
                key: 'output',
                value: true,
                label: '-o, --output <path>',
                description: 'write output to a file (format inferred from extension if -f not set)'
            },
            {
                names: ['-d', '--max-depth'],
                key: 'maxDepth',
                value: true,
                label: '-d, --max-depth <number>',
                description: 'maximum depth to traverse (1 is the top level)'
            },
            {
                names: ['-s', '--show-size'],
                key: 'showSize',
                label: '-s, --show-size',
                description: 'show file sizes',
                defaultKey: 'showSize'
            },
            {
                names: ['-p', '--full-path'],
                key: 'fullPath',
                label: '-p, --full-path',
                description: 'show full paths',
                defaultKey: 'fullPath'
            },
            {
                names: ['-r', '--show-root'],
                key: 'showRoot',
                label: '-r, --show-root',
                description: 'show root directory',
                defaultKey: 'showRoot'
            },
            {
                names: ['--stats'],
                key: 'stats',
                label: '--stats',
                description: 'show directory summary',
                defaultKey: 'stats'
            },
            {
                names: ['--sort'],
                key: 'sort',
                value: true,
                label: '--sort <type>',
                description: 'sort by (name, type, size, extension, directory-first)'
            },
            {
                names: ['--no-gitignore'],
                key: 'noGitignore',
                label: '--no-gitignore',
                description: 'do not respect .gitignore rules'
            }
        ]
    }
};

function binName(argv) {
    const file = argv[1] || 'poplr';
    return path.basename(file, path.extname(file));
}

function isCommand(name) {
    return Object.prototype.hasOwnProperty.call(COMMANDS, name);
}

function optionDescription(option, defaults) {
    if (!option.defaultKey) return option.description;
    return `${option.description} (default: ${Boolean(defaults[option.defaultKey])})`;
}

function formatOptionRows(rows) {
    const width = rows.reduce((max, row) => Math.max(max, row.label.length), 0);
    return rows.map((row) => `  ${row.label.padEnd(width)}  ${row.description}`).join('\n');
}

function rootHelp(name) {
    const commands = [
        { label: 'init [options]', description: COMMANDS.init.description },
        { label: 'config', description: COMMANDS.config.description },
        { label: 'tree [options]', description: COMMANDS.tree.description },
        { label: 'help [command]', description: 'display help for command' }
    ];
    return `Usage: ${name} [options] [command]

A flexible and fun directory tree generator

Options:
${formatOptionRows([
        { label: '-V, --version', description: 'output the version number' },
        { label: '-h, --help', description: 'display help for command' }
    ])}

Commands:
${formatOptionRows(commands)}`;
}

function commandHelp(name, command, defaults) {
    const spec = COMMANDS[command];
    const rows = spec.options.map((option) => ({
        label: option.label,
        description: optionDescription(option, defaults)
    }));
    rows.push({ label: '-h, --help', description: 'display help for command' });
    const usage = spec.options.length > 0 ? `${name} ${command} [options]` : `${name} ${command}`;

    return `Usage: ${usage}

${spec.description}

Options:
${formatOptionRows(rows)}`;
}

function matchOption(token, specs) {
    if (token.startsWith('--')) {
        const eq = token.indexOf('=');
        const name = eq === -1 ? token : token.slice(0, eq);
        const spec = specs.find((item) => item.names.includes(name));
        if (!spec) return null;
        return { spec, inline: eq === -1 ? null : token.slice(eq + 1) };
    }

    const spec = specs.find((item) => item.names.some((flag) => {
        return flag.length === 2 && (token === flag || token.startsWith(flag));
    }));
    if (!spec) return null;

    const flag = spec.names.find((item) => item.length === 2);
    if (token === flag) return { spec, inline: null };
    if (spec.value) return { spec, inline: token.slice(flag.length) };
    return null;
}

function initialOptions(command, defaults) {
    if (command === 'tree') {
        return {
            showSize: Boolean(defaults.showSize),
            fullPath: Boolean(defaults.fullPath),
            showRoot: Boolean(defaults.showRoot),
            stats: Boolean(defaults.stats),
            gitignore: true
        };
    }
    if (command === 'init') return { global: false };
    return {};
}

function parseCli(argv, defaults = {}) {
    const name = binName(argv);
    const tokens = argv.slice(2);

    if (tokens.length === 0) return { interactive: true };

    if (tokens[0] === '-V' || tokens[0] === '--version') return { version: true };
    if (tokens[0] === '-h' || tokens[0] === '--help') return { helpText: rootHelp(name) };

    if (tokens[0] === 'help') {
        if (!tokens[1]) return { helpText: rootHelp(name) };
        if (!isCommand(tokens[1]) || tokens.length > 2) {
            return { error: `error: unknown command '${tokens[1]}'` };
        }
        return { helpText: commandHelp(name, tokens[1], defaults) };
    }

    if (tokens[0].startsWith('-')) return { error: `error: unknown option '${tokens[0]}'` };
    if (!isCommand(tokens[0])) return { error: `error: unknown command '${tokens[0]}'` };

    const command = tokens[0];
    const specs = COMMANDS[command].options;
    const options = initialOptions(command, defaults);

    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '-h' || token === '--help') {
            return { helpText: commandHelp(name, command, defaults) };
        }
        if (token === '-V' || token === '--version') return { version: true };

        const matched = matchOption(token, specs);
        if (!matched) {
            const kind = token.startsWith('-') ? 'option' : 'command';
            return { error: `error: unknown ${kind} '${token}'` };
        }

        if (matched.spec.value) {
            const inline = matched.inline;
            if (inline != null) {
                if (!inline) return { error: `error: option '${matched.spec.label}' argument missing` };
                options[matched.spec.key] = inline;
            } else if (i + 1 >= tokens.length || tokens[i + 1].startsWith('-')) {
                return { error: `error: option '${matched.spec.label}' argument missing` };
            } else {
                options[matched.spec.key] = tokens[i + 1];
                i += 1;
            }
        } else if (matched.spec.key === 'noGitignore') {
            options.gitignore = false;
        } else {
            options[matched.spec.key] = true;
        }
    }

    return { command, options };
}

module.exports = { parseCli, rootHelp, commandHelp };
