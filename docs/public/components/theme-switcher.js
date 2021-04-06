import { useCallback, useEffect } from 'preact/hooks';
import { useLocalStorage } from '../lib/use-localstorage.js';

/**
 * @param {{onChange: (event: Event<HTMLInputElement>) => void, active: string, next:string, value: string}} props
 */
function ThemeItem(props) {
	const { next, active, value, onChange } = props;
	return (
		<>
			<input
				id={`theme-${value}`}
				name="theme"
				type="radio"
				value={value}
				class="is-hidden"
				onClick={onChange}
				checked={active === value}
			/>
			<label for={`theme-${value}`} class="theme-btn" data-active={active === value} data-next={next === value}>
				<img src={`/assets/${value}.svg`} class="icon" alt={`${value} theme`} width="20" height="20" />
			</label>
		</>
	);
}

const THEMES = ['auto', 'dark', 'light', 'teatime'];

export function ThemeSwitcher(props) {
	const [theme, setTheme] = useLocalStorage('theme', THEMES[0]);
	const idx = THEMES.indexOf(theme);
	const next = THEMES[idx + 1] || THEMES[0];

	const toggleTheme = useCallback(e => {
		setTheme(e.target.value);
	}, []);

	useEffect(() => {
		if (theme === 'auto') {
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
