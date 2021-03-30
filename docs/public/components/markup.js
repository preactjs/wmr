import MarkupRenderer from 'preact-markup';

const COMPONENTS = {
	a(props) {
		if (/^(https?:)?\/\//.test(props.href)) {
			props.target = props.target || '_blank';
			props.rel = 'noopener noreferrer';
		}
		return <a {...props} />;
	}
};

export default function Markup({ html }) {
	return <MarkupRenderer markup={html} components={COMPONENTS} type="html" wrap={false} trim={false} />;
}
