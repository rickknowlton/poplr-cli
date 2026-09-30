const { sortItems } = require('../src/utils/sort');

function makeStats(entries) {
    const map = new Map();
    for (const [name, info] of Object.entries(entries)) {
        map.set(name, info);
    }
    return map;
}

describe('sortItems', () => {
    test('name - alphabetical order', () => {
        const result = sortItems(['zebra.js', 'alpha.js', 'mango.js'], 'name', new Map());
        expect(result).toEqual(['alpha.js', 'mango.js', 'zebra.js']);
    });

    test('directory-first - dirs before files, each group alphabetical', () => {
        const stats = makeStats({
            'src': { isDirectory: true, size: 0 },
            'README.md': { isDirectory: false, size: 100 },
            'lib': { isDirectory: true, size: 0 },
            'index.js': { isDirectory: false, size: 50 }
        });
        const result = sortItems(['README.md', 'src', 'index.js', 'lib'], 'directory-first', stats);
        expect(result[0]).toBe('lib');
        expect(result[1]).toBe('src');
        expect(result[2]).toBe('index.js');
        expect(result[3]).toBe('README.md');
    });

    test('size - largest first', () => {
        const stats = makeStats({
            'small.js': { isDirectory: false, size: 100 },
            'large.js': { isDirectory: false, size: 9000 },
            'medium.js': { isDirectory: false, size: 500 }
        });
        const result = sortItems(['small.js', 'large.js', 'medium.js'], 'size', stats);
        expect(result[0]).toBe('large.js');
        expect(result[1]).toBe('medium.js');
        expect(result[2]).toBe('small.js');
    });

    test('extension - grouped by extension, then alphabetical within group', () => {
        const result = sortItems(['b.ts', 'a.js', 'c.ts', 'd.js'], 'extension', new Map());
        expect(result).toEqual(['a.js', 'd.js', 'b.ts', 'c.ts']);
    });

    test('type - dirs first, then alphabetical', () => {
        const stats = makeStats({
            'file.js': { isDirectory: false, size: 0 },
            'dir': { isDirectory: true, size: 0 }
        });
        const result = sortItems(['file.js', 'dir'], 'type', stats);
        expect(result[0]).toBe('dir');
        expect(result[1]).toBe('file.js');
    });

    test('unknown sort type falls back to alphabetical without recursing', () => {
        expect(() => {
            const result = sortItems(['b', 'a', 'c'], 'not-a-real-sort', new Map());
            expect(result).toEqual(['a', 'b', 'c']);
        }).not.toThrow();
    });

    test('empty array returns empty array', () => {
        expect(sortItems([], 'name', new Map())).toEqual([]);
    });

    test('does not mutate the original array', () => {
        const original = ['c', 'a', 'b'];
        sortItems(original, 'name', new Map());
        expect(original).toEqual(['c', 'a', 'b']);
    });
});
