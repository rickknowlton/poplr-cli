const { escapeHtml } = require('../src/utils/html');

describe('escapeHtml', () => {
    test('escapes characters that would break an HTML page', () => {
        expect(escapeHtml('a<b>&"c"\'')).toBe('a&lt;b&gt;&amp;&quot;c&quot;&#39;');
    });
});
