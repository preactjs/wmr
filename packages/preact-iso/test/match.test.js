import { exec } from '../router.js';

function doExec(path, route, opts) {
	return exec(path, route, { path, query: {}, params: {}, ...(opts || {}) });
}

describe('match', () => {
	it('Base route', () => {
		const accurateResult = doExec('/', '/');
		expect(accurateResult).toEqual({ path: '/', params: {}, query: {} });

		const inaccurateResult = doExec('/user/1', '/');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Param route', () => {
		const accurateResult = doExec('/user/2', '/user/:id');
		expect(accurateResult).toEqual({ path: '/user/2', params: { id: '2' }, query: {}, id: '2' });

		const inaccurateResult = doExec('/', '/user/:id');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Optional param route', () => {
		const accurateResult = doExec('/user', '/user/:id?');
		expect(accurateResult).toEqual({ path: '/user', params: { id: undefined }, query: {} });

		const inaccurateResult = doExec('/', '/user/:id?');
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Handles leading/trailing slashes', () => {
		const result = doExec('/about-late/_SEGMENT1_/_SEGMENT2_/', '/about-late/:seg1/:seg2/');
		expect(result).toEqual({
			params: {
				seg1: '_SEGMENT1_',
				seg2: '_SEGMENT2_'
			},
			path: '/about-late/_SEGMENT1_/_SEGMENT2_/',
			query: {},
			seg1: '_SEGMENT1_',
			seg2: '_SEGMENT2_'
		});
	});

	it('should not overwrite existing properties', () => {
		const result = doExec('/foo/bar', '/:path/:query');
		expect(result).toEqual({
			params: { path: 'foo', query: 'bar' },
			path: '/foo/bar',
			query: {}
		});
	});
});
