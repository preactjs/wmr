import net from 'net';
import os from 'os';

/**
 * Check if the requested port is free and increase port number
 * sequentially until we find a free port.
 * @param {number|string} port The suggested port to listen on
 * @returns {Promise<number>} The next free port
 */
export async function getFreePort(port) {
	let found = false;
	let attempts = 0;

	if (typeof port === 'string') port = parseInt(port, 10);

	// Limit to 20 attempts for now
	while (!found && attempts <= 20) {
		try {
			await new Promise((resolve, reject) => {
				const server = net.createServer();
				server.unref();
				server.on('error', reject);
				server.listen({ port }, () => {
					port = server.address().port;
					found = true;
					server.close(resolve);
				});
			});
		} catch (err) {
			if (err.code !== 'EADDRINUSE') throw err;
			port++;
			attempts++;
		}
	}

	return port;
}

/**
 * Display local and network origins for a server's address.
 * @param {net.AddressInfo|string} addr
 */
export function getServerAddresses(addr) {
	if (typeof addr === 'string') {
		return `Listening on ${addr}`;
	}

	const port = addr.port;
	const host = addr.address.replace('::', 'localhost');

	// Get network address
	const ifaces = os.networkInterfaces();
	const addresses = [];
	for (const name in ifaces) {
		for (const iface of ifaces[name]) {
			const { family, address, internal } = iface;
			if (family === 'IPv4' && address !== host && !internal) {
				addresses.push(`http://${address}:${port}`);
			}
		}
	}

	let out = `Listening on http://${host}:${port}`;
	if (addresses.length) {
		out += `\n  ⌙ ${addresses.join(', ')}`;
	}

	return out;
}
