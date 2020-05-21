import { createServer } from 'http';
import { parse as parseUrl } from 'url';
import ws from 'ws';
import polka from 'polka';
import sirv from 'sirv';
import compression from 'compression';

export default function server() {
  const app = polka();

  app.server = createServer();

  app.ws = new ws.Server({ noServer: true });

  app.ws.broadcast = data => {
    app.ws.clients.forEach(client => {
      if (client.readyState !== ws.OPEN) return;
      client.send(JSON.stringify(data));
    });
  };

  app.server.on('upgrade', (req, socket, head) => {
    const pathname = parseUrl(req.url).pathname;
    if (pathname == '/_hmr') {
      app.ws.handleUpgrade(req, socket, head, ws => {
        ws.emit('connection', ws, req);
      });
    }
    else {
      socket.destroy();
    }
  });
  
  app.use(compression({
    threshold: 500
  }));

  app.use(sirv('.dist', { dev: true }));

  const servePublic = sirv('public', { dev: true });
  app.use(servePublic);
  // SPA nav fallback
  app.use((req, res, next) => {
    if (!/text\/html/.test(req.headers.accept)) return next();
    req.path = '/';
    servePublic(req, res, next);
  });

  return app;
}
