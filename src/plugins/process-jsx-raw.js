import astTypes from 'ast-types';
import MagicString from 'magic-string';

const isIdent = name => /(^[A-Z]|[.$])/.test(name);

const isRootElement = path => path.parentPath.parentPath.node.type !== 'JSXElement';

export default function processJsx(ast, out) {
  astTypes.visit(ast, {
    visitJSXOpeningElement(path) {
      const { node } = path;

      let str = '<';
      let name = node.name.name;
      if (isIdent(name)) {
        name = '${' + name + '}';
      }
      str += name;

      if (node.selfClosing) str += ' /';
      str += '>';

      if (isRootElement(path)) {
        str = 'html`' + str;

        if (node.selfClosing) str += '`';
      }

      out.overwrite(node.start, node.end, str);
      return false;
    },
    visitJSXClosingElement(path) {
      const { node } = path;

      let name = node.name.name;
      if (isIdent(name)) name = '/';

      let str = `</${name}>`;
      if (isRootElement(path)) str += '`';

      out.overwrite(node.start, node.end, str);
      return false;
    },
    visitJSXExpression(path) {
      out.appendLeft(path.node.start, '$');
      return this.traverse(path);
    },
    visitJSXText(path) {
      const { start, end, value } = path.node;
      out.overwrite(start, end, value);
      return false;
    }
  });

  return out.toString();
}
