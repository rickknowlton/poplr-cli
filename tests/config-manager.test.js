jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn()
    }
}));

// Re-require after mock is in place
let configManager;
beforeEach(() => {
    jest.resetModules();
    jest.mock('fs', () => ({
        promises: {
            readFile: jest.fn(),
            writeFile: jest.fn()
        }
    }));
    configManager = require('../src/utils/config-manager');
});

describe('ConfigManager.deepMerge', () => {
    test('shallow values from source override target', () => {
        const target = { a: 1, b: 2 };
        const source = { b: 99, c: 3 };
        const result = configManager.deepMerge(target, source);
        expect(result).toEqual({ a: 1, b: 99, c: 3 });
    });

    test('nested objects are merged recursively', () => {
        const target = { display: { fancy: true, useColors: true } };
        const source = { display: { fancy: false } };
        const result = configManager.deepMerge(target, source);
        expect(result.display.fancy).toBe(false);
        expect(result.display.useColors).toBe(true);
    });

    test('arrays are replaced, not merged', () => {
        const target = { filtering: { exclude: ['node_modules', '.git'] } };
        const source = { filtering: { exclude: ['dist'] } };
        const result = configManager.deepMerge(target, source);
        expect(result.filtering.exclude).toEqual(['dist']);
    });
});

describe('ConfigManager.loadConfig', () => {
    test('returns defaults when no config files exist', async () => {
        require('fs').promises.readFile.mockRejectedValue({ code: 'ENOENT' });
        const config = await configManager.loadConfig();
        expect(config.display.fancy).toBe(true);
        expect(config.filtering.respectGitignore).toBe(true);
        expect(config.filtering.exclude).toEqual(['node_modules', '.git', '.DS_Store']);
    });

    test('local config overrides global config', async () => {
        const globalConf = JSON.stringify({ display: { fancy: false }, sorting: { default: 'name' } });
        const localConf = JSON.stringify({ display: { fancy: true } });

        require('fs').promises.readFile
            .mockResolvedValueOnce(globalConf)
            .mockResolvedValueOnce(localConf);

        const config = await configManager.loadConfig();
        expect(config.display.fancy).toBe(true);
        expect(config.sorting.default).toBe('name');
    });
});
