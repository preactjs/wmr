import { createContext } from 'preact';
import { useContext, useRef, useMemo, useState, useLayoutEffect } from 'preact/hooks';

function createSlotContext() {
	const slots = {};
	const owners = {};
	const subs = [];
	const sub = (name, fn) => {
		const e = [name, fn];
		subs.push(e);
		return () => {
			subs.splice(subs.indexOf(e) >>> 0, 1);
		};
	};
	const pub = (name, value, owner) => {
		slots[name] = value;
		owners[name] = owner;
		subs.forEach(s => s[0] === name && s[1](value));
	};
	return { slots, owners, sub, pub };
}

const globalContext = createSlotContext();
const SlotContext = createContext(globalContext);

export function SlotsProvider(props) {
	const value = useMemo(createSlotContext, []);
	return <SlotContext.Provider value={value} {...props} />;
}

export function Slot({ name }) {
	const { slots, sub } = useContext(SlotContext);
	const [slotted, update] = useState(slots[name]);
	useLayoutEffect(() => sub(name, update), [name]);
	return slotted;
}

let c = 0;
export function SlotContent({ name, children = null }) {
	const { owners, pub } = useContext(SlotContext);
	const content = useRef();
	const owner = useRef();
	const initial = useRef(true);
	if (!owner.current) pub(name, children, (owner.current = ++c));
	content.current = children;
	useLayoutEffect(() => {
		if (!initial.current) pub(name, content.current, owner.current);
		initial.current = false;
		return () => owners[name] === owner.current && pub(name, null, 0);
	}, [name]);
	return null;
}
