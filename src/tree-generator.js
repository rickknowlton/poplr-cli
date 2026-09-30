const fs = require('fs').promises;
const path = require('path');
const ignore = require('ignore');
const { color } = require('./utils/color');
const TreeStats = require('./utils/stats');
const { sortItems } = require('./utils/sort');

const DEFAULT_FILE_TYPES = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
    video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    audio: ['.mp3', '.wav', '.ogg', '.m4a'],
    archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    pdf: ['.pdf'],
    code: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json', '.xml']
};

/**
 * @typedef {Object} TreeGeneratorOptions
 * @property {'ascii'|'markdown'|'json'|'console'} format - Output format
 * @property {number|null} maxDepth - Levels from the root. 1 is the top level.
 * @property {boolean} showSize - Show file sizes
 * @property {boolean} fullPath - Show full paths
 * @property {boolean} showRoot - Show root directory
 * @property {boolean} fancy - Use fancy characters
 * @property {Array<string|RegExp>} exclude - Patterns to exclude
 * @property {Array<string>} [include] - Glob patterns; only matching files are shown
 * @property {boolean} useColors - Use colors in output
 * @property {boolean} showStats - Show directory statistics
 * @property {boolean} useIcons - Show file type icons
 * @property {'name'|'type'|'size'|'extension'|'directory-first'} sortBy - Sort method
 * @property {boolean} respectGitignore - Automatically exclude entries listed in .gitignore
 * @property {Object<string, string[]>} [fileTypes] - Extension groups used for icons
 */

class TreeGenerator {
    /** @param {Partial<TreeGeneratorOptions>} options */
    constructor(options = {}) {
        const validFormats = ['ascii', 'markdown', 'json', 'console'];
        const validSortTypes = ['name', 'type', 'size', 'extension', 'directory-first'];

        if (options.format && !validFormats.includes(options.format)) {
            throw new Error(`Invalid format: ${options.format}. Must be one of: ${validFormats.join(', ')}`);
        }

        if (options.sortBy && !validSortTypes.includes(options.sortBy)) {
            throw new Error(`Invalid sort type: ${options.sortBy}. Must be one of: ${validSortTypes.join(', ')}`);
        }

        const format = options.format || 'ascii';

        this.options = {
            format,
            maxDepth: options.maxDepth != null && !Number.isNaN(Number(options.maxDepth))
                ? Number(options.maxDepth)
                : Infinity,
            showSize: options.showSize || false,
            fullPath: options.fullPath || false,
            showRoot: options.showRoot || false,
            fancy: options.fancy !== false,
            exclude: options.exclude || [/node_modules/, /\.git/, /\.DS_Store/],
            include: Array.isArray(options.include) && options.include.length > 0
                ? options.include
                : null,
            useColors: options.useColors === true && (format === 'console' || format === 'ascii'),
            showStats: options.showStats === true,
            useIcons: options.useIcons === true,
            sortBy: options.sortBy || 'directory-first',
            respectGitignore: options.respectGitignore !== false,
            fileTypes: options.fileTypes || DEFAULT_FILE_TYPES
        };

        this.stats = new TreeStats();
        this.symbols = this.getSymbols();
        this.fileIcons = this.getFileIcons();
        this.ignoreMap = new Map();
        this.visited = new Set();
        this.rootPath = null;
    }

    getFileIcons() {
        return {
            directory: '📁',
            file: '📄',
            image: '🖼️',
            video: '🎥',
            audio: '🎵',
            archive: '📦',
            pdf: '📕',
            code: '💻',
            default: '📄'
        };
    }

    /**
     * @param {string} filename
     * @returns {'directory'|'file'|'image'|'video'|'audio'|'archive'|'pdf'|'code'|'default'}
     */
    getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const fileTypeMap = this.options.fileTypes || DEFAULT_FILE_TYPES;

        for (const [type, extensions] of Object.entries(fileTypeMap)) {
            if (Array.isArray(extensions) && extensions.includes(ext)) return type;
        }
        return 'default';
    }

    matchesPattern(name, pattern) {
        if (pattern instanceof RegExp) return pattern.test(name);
        if (pattern.includes('*') || pattern.includes('?')) {
            const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
            const globRe = new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
            return globRe.test(name);
        }
        return name === pattern;
    }

    async loadIgnoreFor(dirPath) {
        if (!this.options.respectGitignore) return;
        if (this.ignoreMap.has(dirPath)) return;
        try {
            const content = await fs.readFile(path.join(dirPath, '.gitignore'), 'utf8');
            this.ignoreMap.set(dirPath, ignore().add(content));
        } catch {
            this.ignoreMap.set(dirPath, null);
        }
    }

    isIgnored(absPath, isDirectory) {
        if (!this.options.respectGitignore || !this.rootPath) return false;

        const relFromRoot = path.relative(this.rootPath, absPath).split(path.sep).join('/');
        if (!relFromRoot || relFromRoot.startsWith('..')) return false;

        const segments = relFromRoot.split('/');
        let dir = this.rootPath;

        for (let i = 0; i < segments.length; i++) {
            const ig = this.ignoreMap.get(dir);
            if (ig) {
                const rel = segments.slice(i).join('/');
                const candidate = isDirectory ? `${rel}/` : rel;
                if (ig.ignores(candidate)) return true;
            }
            if (i < segments.length - 1) {
                dir = path.join(dir, segments[i]);
            }
        }

        return false;
    }

    getSymbols() {
        switch (this.options.format) {
        case 'markdown':
            return {
                pipe: '  ',
                branch: '*',
                last: '*',
                indent: '  '
            };
        default:
            return this.options.fancy ? {
                pipe: '│',
                branch: '├──',
                last: '└──',
                indent: '    '
            } : {
                pipe: '|',
                branch: '|--',
                last: '`--',
                indent: '    '
            };
        }
    }

    /**
     * @param {string} itemPath
     * @returns {Promise<{ isDirectory: boolean, isSymbolicLink: boolean, sizeStr: string, size: number, id: string|null }>}
     */
    async getItemStats(itemPath) {
        try {
            const stats = await fs.lstat(itemPath);
            let sizeStr = '';

            if (this.options.showSize && stats.isFile()) {
                const size = stats.size;
                if (size < 1024) sizeStr = `${size}B`;
                else if (size < 1024 * 1024) sizeStr = `${(size / 1024).toFixed(1)}KB`;
                else if (size < 1024 * 1024 * 1024) sizeStr = `${(size / 1024 / 1024).toFixed(1)}MB`;
                else sizeStr = `${(size / 1024 / 1024 / 1024).toFixed(1)}GB`;
                sizeStr = ` (${sizeStr})`;
            }

            return {
                isDirectory: stats.isDirectory(),
                isSymbolicLink: stats.isSymbolicLink(),
                sizeStr,
                size: stats.size,
                id: `${stats.dev}:${stats.ino}`
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Warning: ${itemPath} not found or inaccessible`);
                return {
                    isDirectory: false,
                    isSymbolicLink: false,
                    sizeStr: '',
                    size: 0,
                    id: null
                };
            }
            throw error;
        }
    }

    formatItem(item, isLast, prefix, itemStats) {
        const { symbols } = this;
        let icon = '';

        if (this.options.useIcons) {
            const type = itemStats.isDirectory ? 'directory' : this.getFileType(item);
            icon = `${this.fileIcons[type] || this.fileIcons.default} `;
        }

        let suffix = '';
        if (itemStats.isSymbolicLink) suffix = '@';
        else if (itemStats.isDirectory) suffix = '/';

        const connector = this.options.format === 'markdown'
            ? symbols.branch
            : (isLast ? symbols.last : symbols.branch);
        const itemStr = `${prefix}${connector} ${icon}${item}${suffix}${itemStats.sizeStr}`;

        return this.options.useColors && itemStats.isDirectory
            ? color(true).blue(itemStr)
            : itemStr;
    }

    async generateTreeNode(currentPath, prefix = '', depth = 0) {
        // maxDepth counts levels from the root: 1 is the top level.
        if (depth >= this.options.maxDepth) return '';

        let output = '';
        let items;

        try {
            items = await fs.readdir(currentPath);
        } catch (error) {
            console.error(`Error reading directory ${currentPath}: ${error.message}`);
            return '';
        }

        await this.loadIgnoreFor(currentPath);

        const statsCache = new Map();
        await Promise.all(items.map(async (item) => {
            const itemPath = path.join(currentPath, item);
            statsCache.set(item, await this.getItemStats(itemPath));
        }));

        const filteredItems = items.filter(item => {
            const itemPath = path.join(currentPath, item);
            const itemStat = statsCache.get(item);
            if (this.isIgnored(itemPath, Boolean(itemStat?.isDirectory))) return false;
            const excluded = this.options.exclude.some(pattern => this.matchesPattern(item, pattern));
            if (excluded) return false;
            if (this.options.include) {
                if (!itemStat.isDirectory) {
                    return this.options.include.some(pattern => this.matchesPattern(item, pattern));
                }
            }
            return true;
        });

        filteredItems.forEach(item => {
            const itemPath = path.join(currentPath, item);
            const stat = statsCache.get(item);
            if (stat.isDirectory) {
                this.stats.addDirectory(depth);
            } else {
                this.stats.addFile(itemPath, stat.size);
            }
        });

        const sortedItems = sortItems(filteredItems, this.options.sortBy, statsCache);

        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            const itemPath = path.join(currentPath, item);
            const isLast = i === sortedItems.length - 1;
            const itemStat = statsCache.get(item);
            const displayName = this.options.fullPath ? itemPath : item;

            output += this.formatItem(displayName, isLast, prefix, itemStat) + '\n';

            if (itemStat.isDirectory) {
                if (itemStat.id && this.visited.has(itemStat.id)) {
                    continue;
                }
                if (itemStat.id) this.visited.add(itemStat.id);

                const newPrefix = this.options.format === 'markdown'
                    ? prefix + this.symbols.indent
                    : prefix + (isLast ? this.symbols.indent : this.symbols.pipe + '   ');
                output += await this.generateTreeNode(itemPath, newPrefix, depth + 1);
            }
        }

        return output;
    }

    async generate(rootPath) {
        if (!rootPath) {
            throw new Error('Root path is required');
        }

        const stats = await fs.stat(rootPath);
        if (!stats.isDirectory()) {
            throw new Error('Path must be a directory');
        }

        this.rootPath = path.resolve(rootPath);
        this.visited = new Set([`${stats.dev}:${stats.ino}`]);
        this.ignoreMap = new Map();
        await this.loadIgnoreFor(this.rootPath);

        let output = '';

        if (this.options.showRoot) {
            const rootName = this.options.fullPath ? this.rootPath : path.basename(this.rootPath);
            const rootStr = `${rootName}/\n`;
            output += this.options.useColors ? color(true).blue(rootStr) : rootStr;
        }

        output += await this.generateTreeNode(this.rootPath);

        if (this.options.showStats && this.options.format !== 'json') {
            output += '\n' + this.stats.getSummary(this.options.useColors);
        }

        switch (this.options.format) {
        case 'markdown':
            return `## Directory Structure\n\n${output}`;
        case 'json':
            return {
                generated: new Date().toISOString(),
                config: { ...this.options },
                tree: output,
                stats: this.options.showStats ? this.stats.getStatsObject() : undefined
            };
        default:
            return output;
        }
    }
}

module.exports = {
    TreeGenerator,
    generateTree: async (rootPath, options = {}) => {
        const generator = new TreeGenerator(options);
        return generator.generate(rootPath);
    }
};
