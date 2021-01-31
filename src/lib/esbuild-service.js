import * as esbuild from 'esbuild';

/** @type {esbuild.Service} */
let inst,
	svc,
	timer,
	usage = 0;

function free() {
	if (--usage) return;
	clearTimeout(timer);
	timer = setTimeout(shutdown, 10);
}

function use() {
	clearTimeout(timer);
	usage++;
}

export function keepalive() {
	use();
	free();
}

export function shutdown() {
	if (inst) inst.stop();
	else if (svc) svc.then(inst => usage || inst.stop());
	inst = svc = null;
}
process.on('beforeExit', shutdown);

/**
 * This function is the same shape as Terser.minify, except that it is async.
 * @param {string} code
 * @param {esbuild.TransformOptions} opts
 */
export async function transform(code, opts) {
	if (!inst) {
		if (!svc) {
			svc = ((esbuild && esbuild.default) || esbuild).startService();
		}
		inst = await svc;
	}
	use();
	try {
		const result = await inst.transform(code, opts);
		return {
			code: result.code,
			map: result.map || null,
			warnings: result.warnings.map(warning => warning.text)
		};
	} catch (err) {
		return {
			error: err
		};
	} finally {
		free();
	}
}
