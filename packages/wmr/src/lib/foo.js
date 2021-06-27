import MagicString from 'magic-string';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const s = new MagicString(`hello world`);
s.prepend('foobar');

fs.writeFileSync(path.join(__dirname, 'test.js'), s.toString());
fs.writeFileSync(
	path.join(__dirname, 'test.js.map'),
	JSON.stringify(s.generateMap({ file: 'test.js', includeContent: true }))
);
