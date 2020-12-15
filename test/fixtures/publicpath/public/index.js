document.getElementById('root').textContent = 'success';

import('./math.js').then(m => {
	m.add(1, 2);
});
