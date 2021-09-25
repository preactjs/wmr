import { loadConfig, createMatchPathAsync } from 'tsconfig-paths';

export default function tsConfigPathsPlugin({ cwd }) {
	const tsconfig = loadConfig(cwd);

	if (tsconfig.resultType === 'failed') {
		return {};
	}

	const matchPath = createMatchPathAsync(cwd, tsconfig.paths, ['exports', 'module', 'main'], false);

	return {
		resolveId(id) {
			return new Promise((resolve, reject) => {
				matchPath(id, undefined, undefined, undefined, (err, resolved) => {
					if (err) reject(err);
					else resolve(resolved);
				});
			});
		}
	};
}
