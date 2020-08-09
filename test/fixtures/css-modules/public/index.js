// @ts-ignore
import style from './style.module.css';

const heading = document.createElement('h1');
heading.textContent = 'should be red';
heading.className = style.heading;
document.body.appendChild(heading);

const text = document.createElement('p');
text.textContent = 'should be blue';
text.className = style.text;
document.body.appendChild(text);
