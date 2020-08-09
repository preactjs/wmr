import { setupTest, runWmr, waitForMessage } from './test-helpers.js';
import expect from 'expect';
import { promises as fs } from 'fs';
import path from 'path';

export const description = 'should create a production build';

/**
 * @param {import('pentf/runner').TaskConfig} config
 */
export async function run(config) {
	const env = await setupTest(config, 'simple', { open: false });
	const instance = await runWmr(config, env.tmp.path, 'build');

	await waitForMessage(instance.output, /Wrote/);

	const files = await fs.readdir(env.tmp.path);
	expect(files).toEqual(['dist', 'public']);

	const dist = await fs.readdir(path.join(env.tmp.path, 'dist'));
	expect(dist).toContainEqual(expect.stringMatching(/^index\.[a-z0-9]+\.js$/));
}
