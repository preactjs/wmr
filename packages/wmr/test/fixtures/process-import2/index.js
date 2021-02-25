import { foo } from './foo.js';
import { bar } from './bar.js';

const result = foo === bar ? 'it works' : 'process.env objs are not equal';
document.getElementById('out').textContent = result;
