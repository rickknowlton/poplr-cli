const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { createSpinner } = require('nanospinner');
const TreeStats = require('./utils/stats');
const { sortItems } = require('./utils/sort');

/**
 * @typedef {Object} TreeGeneratorOptions
 * @property {'ascii'|'markdown'|'json'|'console'} format - Output format
 * @property {number|null} maxDepth - Maximum depth to traverse
 * @property {boolean} showSize - Show file sizes
 * @property {boolean} fullPath - Show full paths
 * @property {boolean} showRoot - Show root directory
 * @property {boolean} fancy - Use fancy characters
 * @property {Array<string|RegExp>} exclude - Patterns to exclude
 * @property {boolean} useColors - Use colors in output
 * @property {boolean} showStats - Show directory statistics
 * @property {boolean} useIcons - Show file type icons
 * @property {'name'|'type'|'size'|'extension'|'directory-first'} sortBy - Sort method
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

        this.options = {
            format: options.format || 'ascii',
            maxDepth: options.maxDepth || Infinity,
            showSize: options.showSize || false,
            fullPath: options.fullPath || false,
            showRoot: options.showRoot || false,
            fancy: options.fancy !== false,
            exclude: options.exclude || [/node_modules/, /\.git/, /\.DS_Store/],
            useColors: options.useColors && options.format === 'console',
            showStats: options.showStats === true,
            useIcons: options.useIcons === true,
            sortBy: options.sortBy || 'directory-first'
        };

        this.stats = new TreeStats();
        this.symbols = this.getSymbols();
        this.fileIcons = this.getFileIcons();
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
        const fileTypeMap = {
            image: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
            video: ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
            audio: ['.mp3', '.wav', '.ogg', '.m4a'],
            archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
            pdf: ['.pdf'],
            code: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json', '.xml']
        };

        for (const [type, extensions] of Object.entries(fileTypeMap)) {
            if (extensions.includes(ext)) return type;
        }
        return 'default';
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
     * @returns {Promise<{ isDirectory: boolean, sizeStr: string, size: number }>}
     */
    async getItemStats(itemPath) {
        try {
            const stats = await fs.stat(itemPath);
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
                sizeStr,
                size: stats.size
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Warning: ${itemPath} not found or inaccessible`);
                return { isDirectory: false, sizeStr: '', size: 0 };
            }
            throw error;
        }
    }

    formatItem(item, isLast, prefix, itemStats) {
        const { symbols } = this;
        let icon = '';

        if (this.options.useIcons) {
            icon = itemStats.isDirectory ?
                this.fileIcons.directory :
                this.fileIcons[this.getFileType(item)];
            icon += ' ';
        }

        const itemStr = this.options.format === 'markdown'
            ? `${prefix}${symbols.branch} ${icon}${item}${itemStats.isDirectory ? '/' : ''}${itemStats.sizeStr}`
            : `${prefix}${isLast ? symbols.last : symbols.branch} ${icon}${item}${itemStats.isDirectory ? '/' : ''}${itemStats.sizeStr}`;

        return this.options.useColors && itemStats.isDirectory
            ? chalk.blue(itemStr)
            : itemStr;
    }

    async generateTreeNode(currentPath, prefix = '', depth = 0) {
        if (depth > this.options.maxDepth) return '';

        let output = '';
        let items;

        try {
            items = await fs.readdir(currentPath);
        } catch (error) {
            console.error(`Error reading directory ${currentPath}: ${error.message}`);
            return '';
        }

        const itemStats = new Map();
        await Promise.all(items.map(async (item) => {
            const itemPath = path.join(currentPath, item);
            const stats = await this.getItemStats(itemPath);
            itemStats.set(item, stats);

            if (stats.isDirectory) {
                this.stats.addDirectory(depth);
            } else {
                this.stats.addFile(itemPath, stats.size);
            }
        }));

        const filteredItems = items.filter(item =>
            !this.options.exclude.some(pattern =>
                typeof pattern === 'string' ? item === pattern : pattern.test(item)
            )
        );

        const sortedItems = sortItems(filteredItems, this.options.sortBy, itemStats);

        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            const itemPath = path.join(currentPath, item);
            const isLast = i === sortedItems.length - 1;
            const itemStats = await this.getItemStats(itemPath);
            const displayName = this.options.fullPath ? itemPath : item;

            output += this.formatItem(displayName, isLast, prefix, itemStats) + '\n';

            if (itemStats.isDirectory) {
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

        const spinner = createSpinner('Analyzing directory structure...').start();

        try {
            const stats = await fs.stat(rootPath);
            if (!stats.isDirectory()) {
                spinner.error({ text: 'Path must be a directory' });
                throw new Error('Path must be a directory');
            }

            let output = '';

            if (this.options.showRoot) {
                const rootName = this.options.fullPath ? rootPath : path.basename(rootPath);
                const rootStr = `${rootName}/\n`;
                output += this.options.useColors ? chalk.blue(rootStr) : rootStr;
            }

            output += await this.generateTreeNode(rootPath);

            if (this.options.showStats && this.options.format !== 'json') {
                output += '\n' + this.stats.getSummary(this.options.useColors);
            }

            spinner.success({ text: 'Directory tree generated!' });
            console.log('');

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
        } catch (error) {
            spinner.error({ text: `Failed to generate tree: ${error.message}` });
            throw error;
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
