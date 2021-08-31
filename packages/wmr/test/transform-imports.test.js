import path from 'path';
import { promises as fs } from 'fs';
import { transformImports } from '../src/lib/transform-imports.js';

/**
 * @param {string} file
 * @returns {Promise<string>}
 */
async function readFile(file) {
	return fs.readFile(path.join(__dirname, 'fixtures', '_unit-transform-imports', file), 'utf-8');
}

describe('transformImports', () => {
	it('should generate source maps', async () => {
		const code = await readFile('static-import.js');
		const result = await transformImports(code, 'my-test', {
			sourcemap: true,
			resolveId(id) {
				if (id === 'foo') return 'a';
				if (id === 'bar') return 'b';
				if (id === 'baz') return 'c';
				return 'nope';
			}
		});
		expect(result.map).not.toEqual(null);
	});

	describe('import statement', () => {
		it('should transform imports', async () => {
			const code = await readFile('static-import.js');
			const expected = await readFile('static-import.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveId(id) {
					if (id === 'foo') return 'a';
					if (id === 'bar') return 'b';
					if (id === 'baz') return 'c';
					return 'nope';
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should transform empty imports', async () => {
			const code = await readFile('static-import-empty.js');
			const expected = await readFile('static-import-empty.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveId() {
					return 'foo';
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should preserve relative spec', async () => {
			const code = await readFile('static-import-relative.js');
			const expected = await readFile('static-import-relative.expected.js');

			const result = await transformImports(code, 'my-test', {
				resolveId(id) {
					if (id === './foo.js?module') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});
	});

	describe('dynamic import', () => {
		it('should transform imports', async () => {
			const code = await readFile('dynamic-import.js');
			const expected = await readFile('dynamic-import.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveDynamicImport(id) {
					if (id === 'foo') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should transform inline', async () => {
			const code = await readFile('dynamic-import-inline.js');
			const expected = await readFile('dynamic-import-inline.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveDynamicImport(id) {
					if (id === './pages/about/index.js') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should transform imports with comments', async () => {
			const code = await readFile('dynamic-import-comment.js');
			const expected = await readFile('dynamic-import-comment.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveDynamicImport(id) {
					if (id === 'foo') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});
	});

	describe('import.meta', () => {
		it('should transform simple property', async () => {
			const code = await readFile('import-meta.js');
			const expected = await readFile('import-meta.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveImportMeta(property) {
					if (property === 'foo') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should transform nested property', async () => {
			const code = await readFile('import-meta-long.js');
			const expected = await readFile('import-meta-long.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveImportMeta(property) {
					if (property === 'env') {
						return 'it_works';
					}
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should transform inline', async () => {
			const code = await readFile('import-meta-inline.js');
			const expected = await readFile('import-meta-inline.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveId(id) {
					throw new Error(`Called resolveId(${id})`);
				},
				resolveDynamicImport(id) {
					throw new Error(`Called resolveDynamicImport(${id})`);
				},
				resolveImportMeta(property) {
					if (property === 'url') {
						return 'foo';
					} else if (property === 'hot') {
						return 'bar';
					}
					return 'nope';
				}
			});
			expect(result.code).toEqual(expected);
		});
	});

	describe('import assertions', () => {
		it('should ignore in static imports', async () => {
			const code = await readFile('import-assertion.js');
			const expected = await readFile('import-assertion.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveId() {
					return 'it_works';
				},
				resolveDynamicImport() {
					return 'it_works_dynamic';
				},
				resolveImportMeta() {
					return 'it_works_meta';
				}
			});
			expect(result.code).toEqual(expected);
		});

		it('should ignore in dynamic imports', async () => {
			const code = await readFile('import-assertion-dynamic.js');
			const expected = await readFile('import-assertion-dynamic.expected.js');
			const result = await transformImports(code, 'my-test', {
				resolveId() {
					return 'it_works';
				},
				resolveDynamicImport() {
					return 'it_works_dynamic';
				},
				resolveImportMeta() {
					return 'it_works_meta';
				}
			});
			expect(result.code).toEqual(expected);
		});
	});
});
