const {
    optionWasPassed,
    resolveFormat,
    resolveSortBy,
    resolveRespectGitignore,
    resolveUseColors
} = require('../src/utils/cli-options');

describe('resolveFormat', () => {
    test('infers format from the output extension when -f is not set', () => {
        expect(resolveFormat({ outputPath: 'structure.md', defaultFormat: 'ascii' })).toBe('markdown');
        expect(resolveFormat({ outputPath: 'tree.json', defaultFormat: 'ascii' })).toBe('json');
        expect(resolveFormat({ outputPath: 'report.html', defaultFormat: 'ascii' })).toBe('html');
        expect(resolveFormat({ outputPath: 'tree.txt', defaultFormat: 'markdown' })).toBe('ascii');
    });

    test('an explicit format wins over the file extension', () => {
        expect(resolveFormat({
            explicitFormat: 'json',
            outputPath: 'structure.md',
            defaultFormat: 'ascii'
        })).toBe('json');
    });

    test('falls back to the config default when there is no extension match', () => {
        expect(resolveFormat({ outputPath: 'tree.foo', defaultFormat: 'markdown' })).toBe('markdown');
        expect(resolveFormat({ defaultFormat: 'ascii' })).toBe('ascii');
    });
});

describe('optionWasPassed', () => {
    test('detects long and short flags without treating defaults as explicit', () => {
        const argv = ['node', 'poplr', 'tree', '-o', 'tree.md'];
        expect(optionWasPassed(argv, ['-f', '--format'])).toBe(false);
        expect(optionWasPassed([...argv, '-f', 'json'], ['-f', '--format'])).toBe(true);
        expect(optionWasPassed([...argv, '--format=html'], ['-f', '--format'])).toBe(true);
        expect(optionWasPassed(['node', 'poplr', 'tree', '-d', '1'], ['-d', '--max-depth'])).toBe(true);
    });
});

describe('config-backed tree options', () => {
    test('sorting.enabled false lists entries by name unless --sort is set', () => {
        expect(resolveSortBy({ sorting: { enabled: false, default: 'size' } })).toBe('name');
        expect(resolveSortBy({
            explicitSort: 'size',
            sorting: { enabled: false, default: 'directory-first' }
        })).toBe('size');
    });

    test('respectGitignore comes from config unless --no-gitignore is passed', () => {
        expect(resolveRespectGitignore({ disabledByFlag: false, configured: false })).toBe(false);
        expect(resolveRespectGitignore({ disabledByFlag: true, configured: true })).toBe(false);
        expect(resolveRespectGitignore({ disabledByFlag: false, configured: true })).toBe(true);
    });

    test('useColors applies on stdout ascii and console output only', () => {
        expect(resolveUseColors({
            writingFile: false,
            format: 'ascii',
            configured: true
        })).toBe(true);
        expect(resolveUseColors({
            writingFile: true,
            format: 'ascii',
            configured: true
        })).toBe(false);
        expect(resolveUseColors({
            writingFile: false,
            format: 'json',
            configured: true
        })).toBe(false);
        expect(resolveUseColors({
            writingFile: false,
            format: 'ascii',
            configured: false
        })).toBe(false);
    });
});
