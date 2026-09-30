const fs = require('fs').promises;
const path = require('path');
const os = require('os');

jest.mock('nanospinner', () => ({
    createSpinner: () => ({
        start: jest.fn().mockReturnThis(),
        success: jest.fn(),
        error: jest.fn()
    })
}));

const { TreeGenerator, generateTree } = require('../src/tree-generator');

let tmpDir;

beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poplr-test-'));

    await fs.mkdir(path.join(tmpDir, 'src'));
    await fs.mkdir(path.join(tmpDir, 'node_modules'));
    await fs.mkdir(path.join(tmpDir, 'dist'));
    await fs.writeFile(path.join(tmpDir, 'README.md'), '# Test');
    await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');
    await fs.writeFile(path.join(tmpDir, 'src', 'index.js'), 'console.log("hi")');
    await fs.writeFile(path.join(tmpDir, 'src', 'utils.js'), 'module.exports = {}');
    await fs.writeFile(path.join(tmpDir, 'node_modules', 'dep.js'), '');
    await fs.writeFile(path.join(tmpDir, 'dist', 'bundle.js'), '');
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'dist/\n*.log\n');
    await fs.writeFile(path.join(tmpDir, 'debug.log'), 'some log');
});

afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('TreeGenerator constructor', () => {
    test('throws on invalid format', () => {
        expect(() => new TreeGenerator({ format: 'pdf' })).toThrow(/Invalid format/);
    });

    test('throws on invalid sortBy', () => {
        expect(() => new TreeGenerator({ sortBy: 'random' })).toThrow(/Invalid sort type/);
    });

    test('coerces maxDepth string to number', () => {
        const tg = new TreeGenerator({ maxDepth: '4' });
        expect(tg.options.maxDepth).toBe(4);
    });

    test('null maxDepth becomes Infinity', () => {
        const tg = new TreeGenerator({ maxDepth: null });
        expect(tg.options.maxDepth).toBe(Infinity);
    });

    test('respectGitignore defaults to true', () => {
        const tg = new TreeGenerator();
        expect(tg.options.respectGitignore).toBe(true);
    });

    test('respectGitignore can be disabled', () => {
        const tg = new TreeGenerator({ respectGitignore: false });
        expect(tg.options.respectGitignore).toBe(false);
    });
});

describe('TreeGenerator.matchesPattern', () => {
    const tg = new TreeGenerator({ format: 'ascii' });

    test('exact string match', () => {
        expect(tg.matchesPattern('node_modules', 'node_modules')).toBe(true);
        expect(tg.matchesPattern('node_modules', '.git')).toBe(false);
    });

    test('glob with wildcard *', () => {
        expect(tg.matchesPattern('debug.log', '*.log')).toBe(true);
        expect(tg.matchesPattern('debug.js', '*.log')).toBe(false);
        expect(tg.matchesPattern('build-prod', 'build-*')).toBe(true);
    });

    test('glob with single-char wildcard ?', () => {
        expect(tg.matchesPattern('file1.js', 'file?.js')).toBe(true);
        expect(tg.matchesPattern('file10.js', 'file?.js')).toBe(false);
    });

    test('RegExp pattern', () => {
        expect(tg.matchesPattern('.git', /\.git/)).toBe(true);
        expect(tg.matchesPattern('something', /\.git/)).toBe(false);
    });
});

describe('generateTree', () => {
    test('produces output string for ascii format', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            respectGitignore: false,
            exclude: []
        });
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });

    test('excludes node_modules by default', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            respectGitignore: false
        });
        expect(output).not.toContain('node_modules');
    });

    test('respects .gitignore - hides dist/ and *.log', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            respectGitignore: true,
            exclude: []
        });
        expect(output).not.toContain('dist');
        expect(output).not.toContain('debug.log');
    });

    test('--no-gitignore shows gitignore-excluded entries', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            respectGitignore: false,
            exclude: []
        });
        expect(output).toContain('dist');
        expect(output).toContain('debug.log');
    });

    test('maxDepth limits traversal depth', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            maxDepth: 0,
            respectGitignore: false,
            exclude: []
        });
        expect(output).not.toContain('index.js');
    });

    test('json format returns an object', async () => {
        const output = await generateTree(tmpDir, {
            format: 'json',
            respectGitignore: false
        });
        expect(typeof output).toBe('object');
        expect(output).toHaveProperty('tree');
        expect(output).toHaveProperty('generated');
        expect(output).toHaveProperty('config');
    });

    test('json format with showStats includes stats object', async () => {
        const output = await generateTree(tmpDir, {
            format: 'json',
            showStats: true,
            respectGitignore: false
        });
        expect(output.stats).toBeDefined();
        expect(typeof output.stats.totalFiles).toBe('number');
    });

    test('markdown format wraps in heading', async () => {
        const output = await generateTree(tmpDir, {
            format: 'markdown',
            respectGitignore: false
        });
        expect(output).toMatch(/^## Directory Structure/);
    });

    test('include filter shows only matching files', async () => {
        const output = await generateTree(tmpDir, {
            format: 'ascii',
            respectGitignore: false,
            exclude: [],
            include: ['*.md']
        });
        expect(output).toContain('README.md');
        expect(output).not.toContain('package.json');
    });

    test('throws when path is not a directory', async () => {
        await expect(
            generateTree(path.join(tmpDir, 'README.md'), { format: 'ascii' })
        ).rejects.toThrow('Path must be a directory');
    });
});
