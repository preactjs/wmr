const kb = x => (x > 1500 ? (x / 1000).toFixed(1) + 'kb' : x + 'b');

/**
 * Generate a formatted string containing code coverage analysis, as well as raw data.
 * @param {import('puppeteer').CoverageEntry[]} entries
 */
export function printCoverage(entries) {
	const files = {};
	let out = '';
	for (const entry of entries) {
		const orig = entry.text;
		let text = '';
		let index = 0;
		let used = 0;
		// Calculate used characters, and an annotated source with unused code in red:
		for (const range of entry.ranges) {
			const before = orig.substring(index, range.start);
			text += `\u001b[31m${before}`;
			const segment = orig.substring(range.start, range.end);
			text += `\u001b[0m${segment}`;
			index = range.end;
			used += segment.length;
		}
		text += `\u001b[31m${orig.substring(index)}\u001b[0m`;

		const url = entry.url.replace(/^http:\/\/[^/]+/, '');
		const size = orig.length;
		const unused = size - used;
		const percentUnused = Math.round((unused / orig.length) * 100);
		// filename and % unused (red for > 30%, green for less):
		const color = unused / size > 0.3 ? '31' : '32';
		out += `\n${url}: \u001b[${color}m${percentUnused}% unused`;
		// show absolute size values (dim text):
		out += `\u001b[0;3m (${kb(unused)} of ${kb(size)})\u001b[0m:`;
		// If >50% unused, print the annotated source code string:
		if (unused / size > 0.5) out += `\n${text}`;
		files[url] = { used, unused, size };
	}
	return { analysis: out, files };
}

/**
 * Generate a formatted event log/details string from a trace.
 * @param {{traceEvents:any[]}} trace
 * @param {import('puppeteer').CoverageEntry[]} jsCoverageData
 */
export function analyzeTrace(trace, jsCoverageData) {
	let timeline = trace.traceEvents.filter(e => e.cat == 'devtools.timeline');
	return timeline.reduce((str, e) => {
		const ts = ((e.ts - timeline[0].ts) / 1000) | 0;
		const tst = String(ts).padStart(4);
		const dur = e.dur && (e.dur / 1000) | 0;
		if (/Mark/.test(e.name)) {
			str += `\n${tst}ms: \u001b[0;1m${e.name.replace(/^Mark/, '')}\u001b[0m Event`;
		} else if (dur > 1) {
			let text = '';
			let attribution = '';
			const info = e.args && e.args.data;
			if (e.name == 'EventDispatch') text = `Dispatch "${info.type}" event`;
			else if (e.name == 'UpdateLayerTree') text = `Update layer tree`;
			else if (e.name == 'TimerFire') text = `timer fired [#${info.timerId}]`;
			else if (e.name == 'FunctionCall') {
				text = `Function ${info.functionName}()`;
				if (jsCoverageData) {
					for (const entry of jsCoverageData) {
						if (entry.url === info.url) {
							const lines = entry.text.split('\n');
							const line = lines[info.lineNumber - 1];
							const start = line
								.substring(0, info.columnNumber + info.functionName.length)
								.lastIndexOf(info.functionName);
							const before = line.substring(0, start).match(/(?:(?:async\s+)?function\s\*?|const|let|var)\s*$/);
							const snippet = ((before && before[0]) || '') + line.substring(start).match(/^[\s\S]*?}/)[0];
							attribution = ` → \u001b[33;2m${snippet}\u001b[0m`;
							break;
						}
					}
				}
			} else text = `${e.name}${info ? ' (' + JSON.stringify(info) + ')' : ''}`;
			str += `\n\u001b[0;2m${tst}ms:\u001b[0m ${text} (${dur}ms)${attribution}`;
		}
		return str;
	}, '');
}
