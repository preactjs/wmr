import { useState } from 'preact/hooks';

document.querySelector('h1').textContent = typeof useState === 'function' ? 'it works' : "it doesn't work";
