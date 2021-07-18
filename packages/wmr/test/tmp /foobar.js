import { useState, useCallback, useEffect, useRef } from "preact/hooks";

const useFoo = () => {
  const [v2, set2] = useState(0);
  useEffect(() => {}, []);
  a + x
  return { value: v2, update: set2 };
};

export function asdfe() {
  const [v, set] = addHookNames(useState(0), "foo");
  useEffect(() => {
		console.log("v", v);
		return () => {
			console.log("update");
		};
	}, [v]);
  a + x
  const onClick = useCallback(() => {
		set(v => v + 1);
	}, []);
  const ref = useRef(null);
  const { value } = useFoo();
  return (
		<div ref={ref}>
			<button onClick={onClick}>click me {value}</button>
		</div>
	);
}