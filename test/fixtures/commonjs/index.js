import fooDefault, * as foo from './foo.cjs';

document.querySelector('#cjsdefault').textContent = JSON.stringify(fooDefault);
document.querySelector('#cjs').textContent = JSON.stringify(foo);
