import contentPlugin from './plugins/content.js';
import markdownPlugin from './plugins/markdown.js';
import prism from './plugins/prism.min.js';

export default function (config) {
	contentPlugin(config);
	markdownPlugin(config, {
		highlight(code, lang) {
			try {
				return prism.highlight(code, prism.languages[lang], lang);
			} catch (e) {
				console.log('Error highlighting ' + lang + ': ', e);
				return code.replace(/[<>&]/g, s => (s == '<' ? '&lt;' : s == '>' ? '&gt;' : '&amp;'));
			}
		}
	});
}
