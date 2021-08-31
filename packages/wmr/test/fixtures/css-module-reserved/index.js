import styles, { foo } from './foo.module.css';

document.querySelector('.foo')?.classList.add(styles.foo);
document.querySelector('.new')?.classList.add(styles.new);
document.querySelector('.debugger')?.classList.add(styles.debugger);
document.querySelector('.const')?.classList.add(foo);
