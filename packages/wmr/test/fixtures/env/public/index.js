// @ts-ignore
document.getElementById('out').textContent = Object.keys(process.env)
	.map(key => `${key}=${JSON.stringify(process.env[key])}`)
	.join(', ');
