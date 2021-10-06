import { forEach } from 'smoldash@0.10.0';

document.querySelector('h1').textContent = typeof forEach === 'function' ? 'it works' : "it doesn't work";
