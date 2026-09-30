const pkg = require('../package.json');

describe('published dependencies', () => {
    test('the runtime install depends only on ignore', () => {
        expect(pkg.dependencies).toEqual({ ignore: '7.0.5' });
        expect(pkg.scripts.postinstall).toBeUndefined();
    });
});
