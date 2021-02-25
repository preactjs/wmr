const USELESS_PROPERTIES = [
	'jest',
	'eslintConfig',
	'eslintIgnore',
	'prettier',
	'babel',
	'scripts',
	'devDependencies',
	'peerDependencies',
	// 'repository',    // tbh this is useful
	'files',
	'keywords',
	'husky',
	'lint-staged'
];

/**
 * Remove pointless properties from package.json files before writing to disk
 * @returns {import("./registry").Plugin}
 */
export default function stripPackageProperties() {
	return {
		name: 'strip-package-properties',
		transform(contents, filename) {
			if (!/(^|\/)package\.json$/.test(filename)) return;
			let pkg;
			try {
				pkg = JSON.parse(contents);
			} catch (e) {
				console.warn(`Invalid package.json`);
			}
			for (const prop of USELESS_PROPERTIES) {
				if (prop in pkg) {
					delete pkg[prop];
				}
			}
			return JSON.stringify(pkg, null, 2);
		}
	};
}
