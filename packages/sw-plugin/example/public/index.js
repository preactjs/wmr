import swURL from 'sw:./sw.js';

console.log(swURL);
navigator.serviceWorker.register(swURL);
