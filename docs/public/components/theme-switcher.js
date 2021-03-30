import { useCallback, useEffect } from 'preact/hooks';
import { useLocalStorage } from '../lib/use-localstorage.js';

const THEMES = ['auto', 'light', 'dark', 'teatime'];

export function ThemeSwitcher(props) {
	const [theme, setTheme] = useLocalStorage('theme', THEMES[0]);

	const toggleTheme = useCallback(e => {
		setTheme(e.target.value);
		const idx = THEMES.indexOf(theme) + 1;
		const newTheme = idx < THEMES.length ? THEMES[idx] : THEMES[0];
	}, []);

	useEffect(() => {
		document.body.parentNode.setAttribute('theme', theme);
	}, [theme]);

	return (
		<>
			<label for="theme-auto" class={props.class}>
				<img src="/assets/auto.svg" alt="Auto theme" width="20" height="20" />
			</label>
			<input id="theme-auto" name="theme" type="radio" value="auto" class="theme-input" onClick={toggleTheme} />

			<label for="theme-light" class={props.class}>
				<img src="/assets/light.svg" alt="Light theme" width="20" height="20" />
			</label>
			<input id="theme-light" name="theme" type="radio" value="light" class="theme-input" onClick={toggleTheme} />

			<label for="theme-dark" class={props.class}>
				<img src="/assets/dark.svg" alt="Dark theme" width="20" height="20" />
			</label>
			<input id="theme-dark" name="theme" type="radio" value="dark" class="theme-input" onClick={toggleTheme} />

			<label for="theme-teatime" class={props.class}>
				<img src="/assets/teatime.svg" alt="teatime theme" width="20" height="20" />
			</label>
			<input id="theme-teatime" name="theme" type="radio" value="teatime" class="theme-input" onClick={toggleTheme} />
		</>
	);
}
