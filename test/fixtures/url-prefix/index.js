import selfUrl from 'url:./index.js';
import htmlUrl from 'url:./index.html';

self.out.textContent = JSON.stringify({ selfUrl, htmlUrl });
