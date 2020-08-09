import { foo, Foo } from './foo';

const t: Foo = foo();

const p = document.createElement('p');
p.id = 'result';
p.textContent = `Result: ${foo()}`;
document.body.appendChild(p);
