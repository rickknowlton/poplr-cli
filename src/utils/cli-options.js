const path = require('path');

const EXTENSION_FORMATS = {
    md: 'markdown',
    json: 'json',
    html: 'html',
    txt: 'ascii'
};

function optionWasPassed(argv, flags) {
    return argv.some((arg) => flags.some((flag) => {
        if (arg === flag) return true;
        if (flag.startsWith('--') && arg.startsWith(`${flag}=`)) return true;
        return !flag.startsWith('--') && arg.startsWith(flag) && arg.length > flag.length;
    }));
}

function resolveFormat({ explicitFormat, outputPath, defaultFormat }) {
    if (explicitFormat) return explicitFormat;
    if (outputPath) {
        const ext = path.extname(outputPath).slice(1).toLowerCase();
        if (EXTENSION_FORMATS[ext]) return EXTENSION_FORMATS[ext];
    }
    return defaultFormat || 'ascii';
}

function resolveSortBy({ explicitSort, sorting }) {
    if (explicitSort) return explicitSort;
    if (sorting && sorting.enabled === false) return 'name';
    return (sorting && sorting.default) || 'directory-first';
}

function resolveRespectGitignore({ disabledByFlag, configured }) {
    if (disabledByFlag) return false;
    return configured !== false;
}

function resolveUseColors({ writingFile, format, configured }) {
    const terminal = !writingFile && (format === 'ascii' || format === 'console');
    return terminal && configured !== false;
}

module.exports = {
    optionWasPassed,
    resolveFormat,
    resolveSortBy,
    resolveRespectGitignore,
    resolveUseColors
};
