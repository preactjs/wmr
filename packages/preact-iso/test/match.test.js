import { exec } from '../router.js';

function execPath(path, pattern, opts) {
	return exec(path, pattern, { path, query: {}, params: {}, ...(opts || {}) });
}

describe('match', () => {
	it('Base route', () => {
		const accurateResult = execPath('/', '/');
		expect(accurateResult).toEqual({ path: '/', params: {}, query: {} });

		const inaccurateResult = execPath('/user/1', '/');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Param route', () => {
		const accurateResult = execPath('/user/2', '/user/:id');
		expect(accurateResult).toEqual({ path: '/user/2', params: { id: '2' }, id: '2', query: {} });

		const inaccurateResult = execPath('/', '/user/:id');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Param rest segment', () => {
		const accurateResult = execPath('/user/foo', '/user/*');
		expect(accurateResult).toEqual({ path: '/user/foo', params: {}, query: {} });

		const inaccurateResult = execPath('/', '/user/:id/*');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Param route with rest segment', () => {
		const accurateResult = execPath('/user/2/foo', '/user/:id/*');
		expect(accurateResult).toEqual({ path: '/user/2/foo', params: { id: '2' }, id: '2', query: {} });

		const inaccurateResult = execPath('/', '/user/:id/*');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Optional param route', () => {
		const accurateResult = execPath('/user', '/user/:id?');
		expect(accurateResult).toEqual({ path: '/user', params: { id: undefined }, id: undefined, query: {} });

		const inaccurateResult = execPath('/', '/user/:id?');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Optional rest param route "/:x*"', () => {
		const accurateResult = execPath('/user', '/user/:id?');
		expect(accurateResult).toEqual({ path: '/user', params: { id: undefined }, id: undefined, query: {} });

		const inaccurateResult = execPath('/', '/user/:id?');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Rest param route "/:x+"', () => {
		const matchedResult = execPath('/user/foo', '/user/:id+');
		expect(matchedResult).toEqual({ path: '/user/foo', params: { id: 'foo' }, id: 'foo', query: {} });

		const matchedResultWithSlash = execPath('/user/foo/bar', '/user/:id+');
		expect(matchedResultWithSlash).toEqual({
			path: '/user/foo/bar',
			params: { id: 'foo/bar' },
			id: 'foo/bar',
			query: {}
		});

		const emptyResult = execPath('/user', '/user/:id+');
		expect(emptyResult).toEqual(undefined);

		const mismatchedResult = execPath('/', '/user/:id+');
		expect(mismatchedResult).toEqual(undefined);
	});

	it('Handles leading/trailing slashes', () => {
		const result = execPath('/about-late/_SEGMENT1_/_SEGMENT2_/', '/about-late/:seg1/:seg2/');
		expect(result).toEqual({
			path: '/about-late/_SEGMENT1_/_SEGMENT2_/',
			params: {
				seg1: '_SEGMENT1_',
				seg2: '_SEGMENT2_'
			},
			seg1: '_SEGMENT1_',
			seg2: '_SEGMENT2_',
			query: {}
		});
	});

	it('should not overwrite existing properties', () => {
		const result = execPath('/foo/bar', '/:path/:query', { path: '/custom-path' });
		expect(result).toEqual({
			params: { path: 'foo', query: 'bar' },
			path: '/custom-path',
			query: {}
		});
	});
});
