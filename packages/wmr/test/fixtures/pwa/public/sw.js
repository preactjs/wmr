addEventListener('install', e => self.skipWaiting());

addEventListener('fetch', e => e.respondWith(fromCache(e.request)));

async function fromCache(req) {
	let res = await caches.match(req);
	if (res) return res;
	res = await fetch((req = req.url.replace(/\?t=\d+/g, '')));
	caches.open('v1').then(c => c.put(req, res));
	return res.clone();
}
