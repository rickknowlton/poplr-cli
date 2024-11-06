const path = require('path');
const bytes = require('bytes');
const chalk = require('chalk');

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

    getSummary(useColors = true) {
        const c = useColors ? chalk : {
            bold: (x) => x,
            blue: (x) => x,
            green: (x) => x,
            yellow: (x) => x
        };

        return `
${c.bold('Directory Summary')}
${c.bold('─'.repeat(30))}
${c.blue('Total Files:')} ${this.totalFiles}
${c.blue('Total Directories:')} ${this.totalDirs}
${c.blue('Total Size:')} ${bytes(this.totalSize)}
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
