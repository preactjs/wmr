import parse from '@polka/url';
import ws from 'ws';
import { moduleGraph } from '../wmr-middleware.js';

/**
 * A WebSocket server that can be mounted at a path.
 * It also exposes a broadcast() method to message all clients.
 */
export default class WebSocketServer extends ws.Server {
	constructor(server, mountPath) {
		super({ noServer: true });
		this.mountPath = mountPath;

		server.on('connection', this.registerListener.bind(this));
		server.on('upgrade', this._handleUpgrade.bind(this));
	}

	registerListener(client) {
		client.on('message', function (data) {
			const message = JSON.parse(data.toString());
			if (message.type === 'hotAccepted') {
				const [id] = message.id.split('?');
				if (!moduleGraph.has(id)) {
					moduleGraph.set(id, { dependencies: new Set(), dependents: new Set(), acceptingUpdates: false });
				}

				const entry = moduleGraph.get(id);
				entry.acceptingUpdates = true;
				entry.stale = false;
			}
		});
	}

	broadcast(data) {
		this.clients.forEach(client => {
			if (client.readyState !== ws.OPEN) return;
			client.send(JSON.stringify(data));
		});
	}

	_handleUpgrade(req, socket, head) {
		if (req.headers['sec-websocket-protocol'] !== 'hmr') {
			return;
		}

		const pathname = parse(req).pathname;
		if (pathname == this.mountPath) {
			this.handleUpgrade(req, socket, head, client => {
				client.emit('connection', client, req);
				this.registerListener(client);
			});
		} else {
			socket.destroy();
		}
	}
}
