// Try to load
async function run() {
	const extensionless = await fetch('/extensionless').then(r => r.text());
	const mp3Header = await fetch('/10-seconds-of-silence.mp3').then(r => r.headers.get('Content-Type'));

	if (extensionless === 'asdf' && mp3Header === 'audio/mpeg') {
		document.querySelector('h1').textContent = 'it works';
	}
}

run();
