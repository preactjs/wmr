import server from './server.js';
import bundler from './bundler.js';

const app = server();

const watcher = bundler({
  onError(err) {
    app.ws.broadcast({
      type: 'error',
      error: err.clientMessage
    });
  },
  onBuild({ changes, duration }) {
    app.ws.broadcast({
      type: 'update',
      dur: duration,
      changes
    });
  }
});

app.listen(process.env.PORT);
