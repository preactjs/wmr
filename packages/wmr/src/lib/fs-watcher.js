import chokidar from 'chokidar';

// We disable Chokidar's automatic fsevents usage, so the useFSEvents option is required.
let useFsEvents;
function initFsEvents() {
	if (useFsEvents === undefined) {
		try {
			eval('require')('fsevents');
			useFsEvents = true;
		} catch (e) {
			useFsEvents = false;
		}
	}
}

/** @type {typeof chokidar.watch} */
export function watch(files, opts) {
	initFsEvents();
	return chokidar.watch(files, {
		useFsEvents,
		...opts
	});
}
