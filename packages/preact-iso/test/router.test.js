import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { h, render } from 'preact';
import { html } from 'htm/preact';
import { LocationProvider, Router, useLocation } from '../router.js';
import lazy, { ErrorBoundary } from '../lazy.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// delayed lazy()
const groggy = (component, ms) => lazy(() => sleep(ms).then(() => component));

describe('Router', () => {
	let scratch;
	beforeEach(() => {
		if (scratch) {
			render(null, scratch);
			scratch.remove();
		}
		scratch = document.createElement('scratch');
		document.body.appendChild(scratch);
		history.replaceState(null, null, '/');
	});

	it('should switch between synchronous routes', async () => {
		const Home = jest.fn(() => html`<h1>Home</h1>`);
		const Profiles = jest.fn(() => html`<h1>Profiles</h1>`);
		const Profile = jest.fn(({ id }) => html`<h1>Profile: ${id}</h1>`);
		const Fallback = jest.fn(() => html`<h1>Fallback</h1>`);
		let loc;
		render(
			html`
				<${LocationProvider}>
					<${Router}>
						<${Home} path="/" />
						<${Profiles} path="/profiles" />
						<${Profile} path="/profiles/:id" />
						<${Fallback} default />
					<//>
					<${() => {
						loc = useLocation();
					}} />
				<//>
			`,
			scratch
		);

		expect(scratch).toHaveProperty('textContent', 'Home');
		expect(Home).toHaveBeenCalledWith({ path: '/', query: {} }, expect.anything());
		expect(Profiles).not.toHaveBeenCalled();
		expect(Profile).not.toHaveBeenCalled();
		expect(Fallback).not.toHaveBeenCalled();
		expect(loc).toMatchObject({
			url: '/',
			path: '/',
			query: {},
			route: expect.any(Function)
		});

		Home.mockReset();
		loc.route('/profiles');
		await sleep(1);

		expect(scratch).toHaveProperty('textContent', 'Profiles');
		expect(Home).not.toHaveBeenCalled();
		expect(Profiles).toHaveBeenCalledWith({ path: '/profiles', query: {} }, expect.anything());
		expect(Profile).not.toHaveBeenCalled();
		expect(Fallback).not.toHaveBeenCalled();

		expect(loc).toMatchObject({
			url: '/profiles',
			path: '/profiles',
			query: {}
		});

		Profiles.mockReset();
		loc.route('/profiles/bob');
		await sleep(1);

		expect(scratch).toHaveProperty('textContent', 'Profile: bob');
		expect(Home).not.toHaveBeenCalled();
		expect(Profiles).not.toHaveBeenCalled();
		expect(Profile).toHaveBeenCalledWith({ path: '/profiles/bob', query: {}, id: 'bob' }, expect.anything());
		expect(Fallback).not.toHaveBeenCalled();

		expect(loc).toMatchObject({
			url: '/profiles/bob',
			path: '/profiles/bob',
			query: {}
		});

		Profile.mockReset();
		loc.route('/other?a=b&c=d');
		await sleep(1);

		expect(scratch).toHaveProperty('textContent', 'Fallback');
		expect(Home).not.toHaveBeenCalled();
		expect(Profiles).not.toHaveBeenCalled();
		expect(Profile).not.toHaveBeenCalled();
		expect(Fallback).toHaveBeenCalledWith(
			{ default: true, path: '/other', query: { a: 'b', c: 'd' } },
			expect.anything()
		);

		expect(loc).toMatchObject({
			url: '/other?a=b&c=d',
			path: '/other',
			query: { a: 'b', c: 'd' }
		});
	});

	it('should wait for asynchronous routes', async () => {
		const A = jest.fn(groggy(() => html`<h1>A</h1>`, 10));
		const B = jest.fn(groggy(() => html`<h1>B</h1>`, 10));
		const C = jest.fn(groggy(() => html`<h1>C</h1>`, 10));
		let loc;
		render(
			html`
				<${ErrorBoundary}>
					<${LocationProvider}>
						<${Router}>
							<${A} path="/" />
							<${B} path="/b" />
							<${C} path="/c" />
						<//>
						<${() => {
							loc = useLocation();
						}} />
					<//>
				<//>
			`,
			scratch
		);

		expect(scratch).toHaveProperty('innerHTML', '');
		expect(A).toHaveBeenCalledWith({ path: '/', query: {} }, expect.anything());

		A.mockClear();
		await sleep(20);

		expect(scratch).toHaveProperty('innerHTML', '<h1>A</h1>');
		expect(A).toHaveBeenCalledWith({ path: '/', query: {} }, expect.anything());

		A.mockClear();
		loc.route('/b');

		expect(scratch).toHaveProperty('innerHTML', '<h1>A</h1>');
		expect(A).not.toHaveBeenCalled();

		await sleep(1);

		expect(scratch).toHaveProperty('innerHTML', '<h1>A</h1>');
		// We should never re-invoke <A /> while loading <B /> (that would be a remount of the old route):
		expect(A).not.toHaveBeenCalled();
		expect(B).toHaveBeenCalledWith({ path: '/b', query: {} }, expect.anything());

		B.mockClear();
		await sleep(20);

		expect(scratch).toHaveProperty('innerHTML', '<h1>B</h1>');
		expect(A).not.toHaveBeenCalled();
		expect(B).toHaveBeenCalledWith({ path: '/b', query: {} }, expect.anything());

		B.mockClear();
		loc.route('/c');
		loc.route('/c?1');
		loc.route('/c');

		expect(scratch).toHaveProperty('innerHTML', '<h1>B</h1>');
		expect(B).not.toHaveBeenCalled();

		await sleep(1);

		loc.route('/c');
		loc.route('/c?2');
		loc.route('/c');

		expect(scratch).toHaveProperty('innerHTML', '<h1>B</h1>');
		// We should never re-invoke <A /> while loading <B /> (that would be a remount of the old route):
		expect(B).not.toHaveBeenCalled();
		expect(C).toHaveBeenCalledWith({ path: '/c', query: {} }, expect.anything());

		C.mockClear();
		await sleep(20);

		expect(scratch).toHaveProperty('innerHTML', '<h1>C</h1>');
		expect(B).not.toHaveBeenCalled();
		expect(C).toHaveBeenCalledWith({ path: '/c', query: {} }, expect.anything());

		// "instant" routing to already-loaded routes

		C.mockClear();
		B.mockClear();
		loc.route('/b');
		await sleep(1);

		expect(scratch).toHaveProperty('innerHTML', '<h1>B</h1>');
		expect(C).not.toHaveBeenCalled();
		// expect(B).toHaveBeenCalledTimes(1);
		expect(B).toHaveBeenCalledWith({ path: '/b', query: {} }, expect.anything());

		B.mockClear();
		loc.route('/');
		await sleep(1);

		expect(scratch).toHaveProperty('innerHTML', '<h1>A</h1>');
		expect(B).not.toHaveBeenCalled();
		// expect(A).toHaveBeenCalledTimes(1);
		expect(A).toHaveBeenCalledWith({ path: '/', query: {} }, expect.anything());
	});

	describe('intercepted VS external links', () => {
		const shouldIntercept = [null, '', '_self', 'self', '_SELF'];
		const shouldNavigate = ['_top', '_parent', '_blank', 'custom', '_BLANK'];

		// prevent actual navigations (not implemented in JSDOM)
		const clickHandler = jest.fn(e => e.preventDefault());

		const Route = jest.fn(
			() => html`
				<div>
					${[...shouldIntercept, ...shouldNavigate].map((target, i) => {
						const url = '/' + i + '/' + target;
						if (target === null) return html`<a href=${url}>target = ${target + ''}</a>`;
						return html`<a href=${url} target=${target}>target = ${target}</a> `;
					})}
				</div>
			`
		);

		let pushState, loc;

		beforeAll(() => {
			pushState = jest.spyOn(history, 'pushState');
			addEventListener('click', clickHandler);
		});

		afterAll(() => {
			pushState.mockRestore();
			removeEventListener('click', clickHandler);
		});

		beforeEach(async () => {
			render(
				html`
					<${LocationProvider}>
						<${Router}>
							<${Route} default />
						<//>
						<${() => {
							loc = useLocation();
						}} />
					<//>
				`,
				scratch
			);
			await sleep(10);
			Route.mockClear();
			clickHandler.mockClear();
			pushState.mockClear();
		});

		const getName = target => (target == null ? 'no target attribute' : `target="${target}"`);

		// these should all be intercepted by the router.
		for (const target of shouldIntercept) {
			it(`should intercept clicks on links with ${getName(target)}`, async () => {
				await sleep(10);

				const sel = target == null ? `a:not([target])` : `a[target="${target}"]`;
				const el = scratch.querySelector(sel);
				if (!el) throw Error(`Unable to find link: ${sel}`);
				const url = el.getAttribute('href');
				el.click();
				await sleep(1);
				expect(loc).toMatchObject({ url });
				expect(Route).toHaveBeenCalledTimes(1);
				expect(pushState).toHaveBeenCalledWith(null, '', url);
				expect(clickHandler).toHaveBeenCalled();
			});
		}

		// these should all navigate.
		for (const target of shouldNavigate) {
			it(`should allow default browser navigation for links with ${getName(target)}`, async () => {
				await sleep(10);

				const sel = target == null ? `a:not([target])` : `a[target="${target}"]`;
				const el = scratch.querySelector(sel);
				if (!el) throw Error(`Unable to find link: ${sel}`);
				el.click();
				await sleep(1);
				expect(Route).not.toHaveBeenCalled();
				expect(pushState).not.toHaveBeenCalled();
				expect(clickHandler).toHaveBeenCalled();
			});
		}
	});
});
