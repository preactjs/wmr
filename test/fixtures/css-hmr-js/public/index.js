import './style.css';

let i = 0;
const el = document.querySelector('#counter');
setInterval(() => (el.textContent = `Counter: ${i++}`), 100);
