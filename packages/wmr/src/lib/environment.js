import { promises as fs } from 'fs';
import { join } from 'path';

const NEWLINE_ALL = /\n|\r|\r\n/;
const KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;

/**
 * Parse env file format.
 * Example
 *   FOO="bar"
 *   Bob=
 *   BOOF='baz'
 *   BAR=123
 *   BOING="bar\\nboof\\n"
 * @param {string} str
 */
export function parseEnvFile(str) {
	return str.split(NEWLINE_ALL).reduce((acc, line) => {
		const match = line.match(KEY_VAL);
		if (match) {
			const key = match[1];
			// Convert missing value to empty string
			let value = match[2] || '';

			const last = value.length - 1;
			const doubleQuotes = value[0] === '"' && value[last] === '"';
			const singleQuotes = value[0] === "'" && value[last] === "'";

			if (singleQuotes || doubleQuotes) {
				value = value.substring(1, last);

				if (doubleQuotes) {
					value = value.replace(/\\n/g, '\n');
				}
			} else {
				value = value.trim();
			}

			acc[key] = value;
		}
		return acc;
	}, {});
}

/**
 * Load additional environment variables from .env files.
 * @param {string} cwd
 * @param {string[]} envFiles
 * @param {string[]} [configWatchFiles]
 * @returns {Promise<Record<string, string>>}
 */
export async function readEnvFiles(cwd, envFiles, configWatchFiles) {
	const envs = await Promise.all(
		envFiles.map(async file => {
			const fileName = join(cwd, file);
			try {
				const content = await fs.readFile(fileName, 'utf-8');
				if (configWatchFiles) configWatchFiles.push(fileName);
				return parseEnvFile(content);
			} catch (e) {
				// Ignore, env file most likely doesn't exist
				return {};
			}
		})
	);

	return envs.reduce((acc, obj) => Object.assign(acc, obj), {});
}
