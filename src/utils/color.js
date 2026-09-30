const CODES = {
    red: '31',
    green: '32',
    yellow: '33',
    blue: '34',
    bold: '1'
};

function colorsEnabled(requested = true) {
    if (!requested) return false;
    if (process.env.NO_COLOR) return false;
    if (process.env.FORCE_COLOR === '0') return false;
    if (process.env.FORCE_COLOR) return true;
    return Boolean(process.stdout.isTTY);
}

function color(enabled = true) {
    const painter = {};
    for (const [name, code] of Object.entries(CODES)) {
        painter[name] = enabled
            ? (text) => `\u001b[${code}m${text}\u001b[0m`
            : (text) => text;
    }
    return painter;
}

module.exports = { color, colorsEnabled };
