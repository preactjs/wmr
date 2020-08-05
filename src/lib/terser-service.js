import greenlet from './greenlet.js';

const runTerser = (code, opts) => require('terser').minify(code, opts);

// not used
export function keepalive() {}

let timer;
function shutdown() {
	if (processing || used.length) return;
	free.forEach(t => t.terminate());
	free.length = 0;
	nextFreeInstance = null;
}

const MAX = 4; // parallelism
const free = [];
const used = [];
let nextFreeInstance;
let processing = false;
const queue = [];

function getInstance() {
	let terser = free.pop();
	if (!terser && free.length + used.length < MAX) {
		terser = greenlet(runTerser);
	}
	if (terser) {
		used.push(terser);
		return terser;
	}
	if (!nextFreeInstance) {
		let r;
		nextFreeInstance = new Promise(resolve => {
			r = resolve;
		});
		nextFreeInstance.resolve = r;
	}
	return nextFreeInstance.then(getInstance);
}

async function process() {
	processing = true;
	clearTimeout(timer);
	const p = [];
	// the worklist can grow during this async iteration.
	// this happens when we're waiting on a free worker,
	// but *not* when waiting on work to complete.
	for (let i = 0; i < queue.length; i++) {
		const terser = await getInstance();
		const { code, opts, resolve, reject } = queue[i];
		p[i] = terser(code, opts)
			.then(resolve)
			.catch(reject)
			.then(() => {
				used.splice(used.indexOf(terser), 1);
				free.push(terser);
				let n = nextFreeInstance;
				nextFreeInstance = null;
				if (n) n.resolve();
			});
	}
	queue.length = 0;
	processing = false;
	Promise.all(p).then(() => {
		// there is no remaining work.
		timer = setTimeout(shutdown, 10);
	});
}

/**
 * This function is the same shape as Terser.minify, except that it is async.
 * @param {string} code
 * @param {import('terser').MinifyOptions} opts
 */
export function transform(code, opts) {
	return new Promise((resolve, reject) => {
		queue.push({ code, opts, resolve, reject });
		if (!processing) {
			process();
		}
	});
}

// Alternative single-worker implementation:

/*
let inst,
	timer,
	usage = 0;

function free() {
	if (--usage) return;
	clearTimeout(timer);
	timer = setTimeout(shutdown, 10);
}

function use() {
	usage++;
	clearTimeout(timer);
}

export function keepalive() {
	use();
	free();
}

export function shutdown() {
	if (inst) inst.terminate();
	inst = null;
}
process.on('beforeExit', shutdown);

/\**
 * This function is the same shape as Terser.minify, except that it is async.
 * @param {string} code
 * @param {import('terser').MinifyOptions} opts
 *\/
export async function transform(code, opts) {
	// if (!inst) inst = greenlet(runTerser);

	let t = greenlet(runTerser);

	use();
	try {
		return await t(code, opts);
	} finally {
		inst.terminate();
		free();
	}
}
*/
