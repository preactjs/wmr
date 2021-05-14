document.getElementById('out').textContent = [import.meta.env.FOO, import.meta.env.WMR_FOO, import.meta.env.WMR_BAR]
	.filter(Boolean)
	.join(' ');
