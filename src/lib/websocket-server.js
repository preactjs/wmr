import parse from '@polka/url';
import ws from 'ws';

/**
 * A WebSocket server that can be mounted at a path.
 * It also exposes a broadcast() method to message all clients.
 */
export default class WebSocketServer extends ws.Server {
	constructor(server, mountPath) {
		super({ noServer: true });
		this.mountPath = mountPath;
		server.on('upgrade', this._handleUpgrade.bind(this));
	}

	broadcast(data) {
		this.clients.forEach(client => {
			if (client.readyState !== ws.OPEN) return;
			client.send(JSON.stringify(data));
		});
	}

	_handleUpgrade(req, socket, head) {
		const pathname = parse(req.url).pathname;
		if (pathname == this.mountPath) {
			this.handleUpgrade(req, socket, head, client => {
				client.emit('connection', client, req);
			});
		} else {
			socket.destroy();
		}
	}
}
