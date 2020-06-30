import * as htmlparser2 from 'htmlparser2/lib/Parser.js';

const cjsDefault = m => ('default' in m ? m.default : m);

const { Parser } = cjsDefault(htmlparser2);

/**
 * @param {string} html
 * @param {(tagName: string, attrs: Record<string, string>) => void}} callback
 */
export function parse(html, callback) {
	currentCallback = callback;
	parser.parseComplete(html);
}

let currentCallback;
const parser = new Parser(
	{
		onopentag(name, attrs) {
			currentCallback(name, attrs);
		}
	},
	{ decodeEntities: true }
);
