// src/utils/sort.js
const path = require('path');

function sortItems(items, sortBy = 'directory-first', stats = new Map()) {
    return [...items].sort((a, b) => {
        const statsA = stats.get(a);
        const statsB = stats.get(b);

        switch (sortBy) {
        case 'directory-first':
            if (statsA?.isDirectory && !statsB?.isDirectory) return -1;
            if (!statsA?.isDirectory && statsB?.isDirectory) return 1;
            return a.localeCompare(b);

        case 'size':
            if (!statsA || !statsB) return 0;
            return statsB.size - statsA.size;

        case 'type':
            if (!statsA || !statsB) return 0;
            if (statsA.isDirectory && !statsB.isDirectory) return -1;
            if (!statsA.isDirectory && statsB.isDirectory) return 1;
            return a.localeCompare(b);

        case 'extension': {
            const extA = path.extname(a).toLowerCase();
            const extB = path.extname(b).toLowerCase();
            if (extA === extB) return a.localeCompare(b);
            return extA.localeCompare(extB);
        }

        case 'name':
            return a.localeCompare(b);

        default:
            return sortItems(items, 'directory-first', stats);
        }
    });
}

module.exports = { sortItems };
