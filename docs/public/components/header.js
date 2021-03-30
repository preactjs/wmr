import { useLocation } from 'preact-iso';
import { ThemeSwitcher } from './theme-switcher.js';

export default function Header() {
	const { path } = useLocation();

	return (
		<div class="header-area">
			<header class="header">
				<nav aria-label="primary" class="menu">
					<a href="/" class="menu-item" data-active={path === '/'}>
						WMR
					</a>
					<a href="/docs" class="menu-item" data-active={path.startsWith('/docs')}>
						Docs
					</a>
				</nav>
				<nav aria-label="social" class="menu">
					<ThemeSwitcher class="menu-item menu-item-icon" />

					<a
						href="https://twitter.com/preactjs"
						target="_blank"
						rel="noopener noreferrer"
						class="menu-item menu-item-icon"
					>
						<img src="/assets/twitter.svg" alt="@preactjs on Twitter" class="icon" width="20" height="20" />
					</a>
					<a
						href="https://github.com/preactjs/wmr"
						target="_blank"
						rel="noopener noreferrer"
						class="menu-item menu-item-icon"
					>
						<img src="/assets/github.svg" alt="WMR on GitHub" class="icon" width="20" height="20" />
						<span class="menu-item-icon-label">v1.4.2</span>
					</a>
				</nav>
			</header>
		</div>
	);
}
