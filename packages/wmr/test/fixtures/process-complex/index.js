import withoutFullAccess from './other.js';

const { WMR_A, WMR_B } = process.env;
const NODE_ENV = process.env.NODE_ENV;
const keys = Object.keys(process.env);
const type = typeof process;
const typeofEnv = typeof process.env;
const typeofWMR_A = typeof process.env.WMR_A;

document.getElementById('out').textContent = JSON.stringify({
	WMR_A,
	WMR_B,
	NODE_ENV,
	keys,
	withFullAccess: {
		type,
		typeofEnv,
		typeofWMR_A
	},
	withoutFullAccess
});
