const { parseCli } = require('../src/utils/args');

const argv = (...args) => ['node', 'cli', ...args];

describe('parseCli', () => {
    test('no arguments opens the interactive menu', () => {
        expect(parseCli(['node', 'cli'])).toEqual({ interactive: true });
    });

    test('version and help flags', () => {
        expect(parseCli(argv('--version'))).toEqual({ version: true });
        expect(parseCli(argv('tree', '-V'))).toEqual({ version: true });
        expect(parseCli(argv('--help')).helpText).toContain('Commands:');
        expect(parseCli(argv('help', 'tree')).helpText).toContain('--max-depth');
        expect(parseCli(argv('init', '-h')).helpText).toContain('--global');
    });

    test('unknown command and option', () => {
        expect(parseCli(argv('nope')).error).toBe('error: unknown command \'nope\'');
        expect(parseCli(argv('tree', '--nope')).error).toBe('error: unknown option \'--nope\'');
    });

    test('tree options, including attached values and --no-gitignore', () => {
        const parsed = parseCli(argv('tree', '-d2', '--format=json', '--no-gitignore', '-s'), {
            showSize: false,
            fullPath: true,
            showRoot: false,
            stats: false
        });
        expect(parsed.command).toBe('tree');
        expect(parsed.options.maxDepth).toBe('2');
        expect(parsed.options.format).toBe('json');
        expect(parsed.options.gitignore).toBe(false);
        expect(parsed.options.showSize).toBe(true);
        expect(parsed.options.fullPath).toBe(true);
    });

    test('a value flag without a value is an error', () => {
        expect(parseCli(argv('tree', '-d')).error).toBe('error: option \'-d, --max-depth <number>\' argument missing');
    });

    test('boolean defaults come from config until a flag sets them', () => {
        const parsed = parseCli(argv('tree'), { showSize: true, stats: true });
        expect(parsed.options.showSize).toBe(true);
        expect(parsed.options.stats).toBe(true);
        expect(parsed.options.gitignore).toBe(true);
    });
});
