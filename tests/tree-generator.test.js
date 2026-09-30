const fs = require('fs').promises;
const path = require('path');
const os = require('os');

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

    test('maxDepth 1 is the top level and maxDepth 2 includes the next level', async () => {
        const top = await generateTree(tmpDir, {
            format: 'ascii',
            maxDepth: 1,
            respectGitignore: false,
            exclude: []
        });
        expect(top).toContain('README.md');
        expect(top).toContain('src/');
        expect(top).not.toContain('index.js');

        const nested = await generateTree(tmpDir, {
            format: 'ascii',
            maxDepth: 2,
            respectGitignore: false,
            exclude: []
        });
        expect(nested).toContain('index.js');
    });

    test('nested .gitignore rules are applied', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'poplr-nested-'));
        try {
            await fs.mkdir(path.join(dir, 'nested'));
            await fs.writeFile(path.join(dir, 'nested', 'keep.js'), '');
            await fs.writeFile(path.join(dir, 'nested', 'skip.js'), '');
            await fs.writeFile(path.join(dir, 'nested', '.gitignore'), 'skip.js\n');

            const output = await generateTree(dir, {
                format: 'ascii',
                respectGitignore: true,
                exclude: []
            });
            expect(output).toContain('keep.js');
            expect(output).not.toContain('skip.js');
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    });

    test('symbolic links are shown with @ and are not followed', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'poplr-link-'));
        const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'poplr-link-target-'));
        try {
            await fs.writeFile(path.join(dir, 'keep.txt'), 'x');
            await fs.writeFile(path.join(outside, 'secret.txt'), 'x');
            await fs.symlink(outside, path.join(dir, 'linked'));
            await fs.symlink(dir, path.join(dir, 'loop'));

            const output = await generateTree(dir, {
                format: 'ascii',
                respectGitignore: false,
                exclude: []
            });
            expect(output).toContain('linked@');
            expect(output).toContain('loop@');
            expect(output).not.toContain('secret.txt');
            expect(output).toContain('keep.txt');
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
            await fs.rm(outside, { recursive: true, force: true });
        }
    });

    test('uses fileTypes from options for icon categories', () => {
        const tg = new TreeGenerator({
            fileTypes: { code: ['.png'] }
        });
        expect(tg.getFileType('photo.png')).toBe('code');
        expect(tg.getFileType('notes.md')).toBe('default');
    });

    test('json format does not print a spinner or leading blank line', async () => {
        const log = jest.spyOn(console, 'log').mockImplementation(() => {});
        try {
            const output = await generateTree(tmpDir, {
                format: 'json',
                respectGitignore: false
            });
            expect(log).not.toHaveBeenCalled();
            expect(typeof output.tree).toBe('string');
            expect(output.tree.startsWith('\n')).toBe(false);
        } finally {
            log.mockRestore();
        }
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
