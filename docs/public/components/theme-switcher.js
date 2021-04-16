import { useCallback, useEffect, useRef } from 'preact/hooks';
import { useLocalStorage } from '../lib/use-localstorage.js';

/**
 * @param {{onChange: (event: Event<HTMLInputElement>) => void, active: string, next:string, value: string}} props
 */
function ThemeItem(props) {
	const { next, active, value, onChange } = props;
	return (
		<label class="theme-btn" data-active={active === value} data-next={next === value}>
			<img src={`/assets/${value}.svg`} class="icon" alt={`${value} theme`} width="20" height="20" />
			<input
				name="theme"
				type="radio"
				value={value}
				class="is-hidden"
				onClick={onChange}
				checked={active === value}
			/>
		</label>
	);
}

const THEMES = ['auto', 'dark', 'light', 'teatime'];

export function ThemeSwitcher(props) {
	const [theme, setTheme] = useLocalStorage('theme', THEMES[0], true);
	const idx = THEMES.indexOf(theme);
	const next = THEMES[idx + 1] || THEMES[0];

	const toggleTheme = useCallback(e => {
		setTheme(e.target.value);
	}, []);

	const first = useRef(true);

	useEffect(() => {
		if (first.current) {
			// ignore the first render, which is just "auto" for hydration
			first.current = false;
		} else if (theme === 'auto') {
			document.documentElement.removeAttribute('theme');
		} else {
			document.documentElement.setAttribute('theme', theme);
		}
	}, [theme]);

	return (
		<div class={props.class ? ' ' + props.class : ''}>
			<div class="theme-switcher">
				{THEMES.map(t => (
					<ThemeItem value={t} onChange={toggleTheme} next={next} active={theme} />
				))}
			</div>
		</div>
	);
}
