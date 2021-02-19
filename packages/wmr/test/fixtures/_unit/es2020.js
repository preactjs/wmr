
/* eslint-disable */
// prettier-ignore
export async function* x({z: [, {...y}] = [0, {}]} = {}) {
	yield await (await fetch('data:,{"foo":"bar"}')).json();
	const {a: [, a]} = await import('data:;text/javascript,export let a=[1,2]');
	yield a ** 2;
	return <>
		<ul id="list" className={'a-list'} disabled>
			{[...Object.entries(y)].map(([k, v]) => <li key={k}>{v}</li>)}
		</ul>
		<Foo {...y}/>
	</>;
}
const Foo = ({a = 'a'}) => null;
export {default as foo} from 'data:;text/javascript,export default 42';
import a, { b } from 'data:;text/javascript,export default "a";export const b=43';
console.log(...[a, b]);
