import { exec } from '../router.js';

describe('match', () => {
	it('Base route', () => {
		const accurateResult = exec('/', '/', { path: '/' });
		expect(accurateResult).toEqual({ path: '/' });

		const inaccurateResult = exec('/user/1', '/', { path: '/' });
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Param route', () => {
		const accurateResult = exec('/user/2', '/user/:id', { path: '/' });
		expect(accurateResult).toEqual({ path: '/', id: '2' });

		const inaccurateResult = exec('/', '/user/:id', { path: '/' });
		expect(inaccurateResult).toEqual(undefined);
	});

	it('Optional param route', () => {
		const accurateResult = exec('/user', '/user/:id?', { path: '/' });
		expect(accurateResult).toEqual({ path: '/' });

		const inaccurateResult = exec('/', '/user/:id?', { path: '/' });
		expect(inaccurateResult).toEqual(undefined);
	});
});
