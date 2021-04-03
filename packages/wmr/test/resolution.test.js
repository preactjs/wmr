import { serializeSpecifier, resolveFile, deserializeSpecifier } from '../src/plugins/plugin-utils.js';

describe('resolution', () => {
	describe('resolveFile', () => {
		it('should resolve against include directories', () => {
			expect(resolveFile('/foo/bar', '/foo', ['/foo'])).toEqual('/foo/bar');
			expect(resolveFile('/foo/bar', '/foo', ['/bar', '/foo'])).toEqual('/foo/bar');
			expect(resolveFile('/foo/../foo/bar', '/foo', ['/bar', '/foo'])).toEqual('/foo/bar');
			expect(resolveFile('/../../foo/bar', '/foo', ['/bar', '/foo'])).toEqual('/foo/bar');
		});

		it('resolve relative', () => {
			expect(resolveFile('./bar', '/foo', ['/bar', '/foo'])).toEqual('/foo/bar');
		});

		it('should throw on invalid dirs', () => {
			expect(() => resolveFile('/foo2/bar', '/foo', ['/foo'])).toThrow();
		});
	});

	describe('serializeSpecifier', () => {
		it('should leave files in cwd as is', () => {
			expect(serializeSpecifier('./foo/bar', '/public', ['/public'])).toEqual('./foo/bar');
			expect(serializeSpecifier('./foo/../foo/bar', '/public', ['/public'])).toEqual('./foo/bar');
			expect(serializeSpecifier('../public/foo/bar', '/public', ['/public'])).toEqual('./foo/bar');
			expect(
				serializeSpecifier('./foo/bar/bob.js', '/public', ['/public'], { importer: './foo/bar/boof/baz.js' })
			).toEqual('../bob.js');
		});

		it('should rewrite paths outside of cwd but in include dir', () => {
			expect(serializeSpecifier('../../foo/bar', '/public', ['/public', '/foo'])).toEqual('/@path/__/foo/bar');
		});

		it('throw when path is outside of cwd and NOT in include dir', () => {
			expect(() => serializeSpecifier('../../foo/bar', '/public', ['/public'])).toThrow();
		});

		it('should leave relative path if in same include dir as importer', () => {
			expect(
				serializeSpecifier('../foo/bar.js', '/public', ['/public', '/foo'], { importer: '../foo/foo.js' })
			).toEqual('./bar.js');
		});

		it('should rewrite path if in other include dir as importer', () => {
			expect(
				serializeSpecifier('../foo/bar.js', '/public', ['/public', '/foo', '/bar'], { importer: '../bar/foo.js' })
			).toEqual('/@path/__/foo/bar.js');
		});
	});

	describe('deserializeSpecifier', () => {
		it('should keep relative paths as is', () => {
			expect(deserializeSpecifier('/foo/bar')).toEqual('/foo/bar');
			expect(deserializeSpecifier('/foo/bar')).toEqual('/foo/bar');
		});

		it('should parse serialized paths', () => {
			expect(deserializeSpecifier('/@path/bar')).toEqual('./bar');
			expect(deserializeSpecifier('/@path/__/bar')).toEqual('../bar');
			expect(deserializeSpecifier('/@path/__/__bar__')).toEqual('../__bar__');
		});
	});
});
