const path = require('path');
const { color } = require('./color');

function formatBytes(size) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(size) || 0;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded}${units[unit]}`;
}

class TreeStats {
    constructor() {
        this.totalFiles = 0;
        this.totalDirs = 0;
        this.totalSize = 0;
        this.fileTypes = new Map();
        this.maxDepthReached = 0;
        this.startTime = Date.now();
    }

    addFile(filePath, size) {
        this.totalFiles++;
        this.totalSize += size;
        const ext = path.extname(filePath).toLowerCase() || 'no extension';
        this.fileTypes.set(ext, (this.fileTypes.get(ext) || 0) + 1);
    }

    addDirectory(depth) {
        this.totalDirs++;
        this.maxDepthReached = Math.max(this.maxDepthReached, depth);
    }

    getTimeTaken() {
        return ((Date.now() - this.startTime) / 1000).toFixed(2);
    }

    getStatsObject() {
        return {
            totalFiles: this.totalFiles,
            totalDirs: this.totalDirs,
            totalSize: this.totalSize,
            maxDepthReached: this.maxDepthReached,
            scanTimeSeconds: parseFloat(this.getTimeTaken()),
            fileTypes: Object.fromEntries(this.fileTypes)
        };
    }

    getSummary(useColors = true) {
        const c = color(useColors);

        return `
${c.bold('Directory Summary')}
${c.bold('─'.repeat(30))}
${c.blue('Total Files:')} ${this.totalFiles}
${c.blue('Total Directories:')} ${this.totalDirs}
${c.blue('Total Size:')} ${formatBytes(this.totalSize)}
${c.blue('Max Depth:')} ${this.maxDepthReached} levels
${c.blue('Scan Time:')} ${this.getTimeTaken()}s

${c.bold('File Types')}
${c.bold('─'.repeat(30))}
${Array.from(this.fileTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([ext, count]) => `${c.yellow(ext.padEnd(15))} ${count} files`)
        .join('\n')}
`;
    }
}

module.exports = TreeStats;
