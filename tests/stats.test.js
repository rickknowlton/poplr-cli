const TreeStats = require('../src/utils/stats');

describe('TreeStats', () => {
    let stats;

    beforeEach(() => {
        stats = new TreeStats();
    });

    test('starts with zero counts', () => {
        const obj = stats.getStatsObject();
        expect(obj.totalFiles).toBe(0);
        expect(obj.totalDirs).toBe(0);
        expect(obj.totalSize).toBe(0);
        expect(obj.maxDepthReached).toBe(0);
    });

    test('addFile increments file count and total size', () => {
        stats.addFile('/project/src/index.js', 512);
        stats.addFile('/project/src/utils.js', 1024);
        const obj = stats.getStatsObject();
        expect(obj.totalFiles).toBe(2);
        expect(obj.totalSize).toBe(1536);
    });

    test('addDirectory increments dir count and tracks max depth', () => {
        stats.addDirectory(0);
        stats.addDirectory(3);
        stats.addDirectory(1);
        const obj = stats.getStatsObject();
        expect(obj.totalDirs).toBe(3);
        expect(obj.maxDepthReached).toBe(3);
    });

    test('getStatsObject tracks file types by extension', () => {
        stats.addFile('/project/index.js', 100);
        stats.addFile('/project/utils.js', 200);
        stats.addFile('/project/README.md', 50);
        stats.addFile('/project/Makefile', 30);
        const obj = stats.getStatsObject();
        expect(obj.fileTypes['.js']).toBe(2);
        expect(obj.fileTypes['.md']).toBe(1);
        expect(obj.fileTypes['no extension']).toBe(1);
    });

    test('getStatsObject returns numeric scanTimeSeconds', () => {
        const obj = stats.getStatsObject();
        expect(typeof obj.scanTimeSeconds).toBe('number');
        expect(obj.scanTimeSeconds).toBeGreaterThanOrEqual(0);
    });

    test('getSummary returns a non-empty string', () => {
        stats.addFile('/project/index.js', 1024);
        stats.addDirectory(1);
        const summary = stats.getSummary(false);
        expect(typeof summary).toBe('string');
        expect(summary).toContain('Total Files:');
        expect(summary).toContain('Total Directories:');
    });
});
