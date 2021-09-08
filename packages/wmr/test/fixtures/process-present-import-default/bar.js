import process from './process.js';

export const win32 = {
	resolve() {
		const resolvedDevice = 'foo';
		return process.env[`=${resolvedDevice}`] || process.cwd();
	}
};
