/**
 * cssnano is great, but it's hard to package and quite large.
 * This is essentially the same plugins, but without SVGO.
 */
import postcss from 'postcss';
import discardComments from 'postcss-discard-comments';
import postcssReduceInitial from 'postcss-reduce-initial';
import postcssReduceTransforms from 'postcss-reduce-transforms';
import postcssConvertValues from 'postcss-convert-values';
import postcssCalc from 'postcss-calc';
import postcssColormin from 'postcss-colormin';
import postcssOrderedValues from 'postcss-ordered-values';
import postcssMinifySelectors from 'postcss-minify-selectors';
import postcssMinifyParams from 'postcss-minify-params';
import postcssMinifyFontValues from 'postcss-minify-font-values';
import postcssNormalizeUrl from 'postcss-normalize-url';
import postcssMergeLonghand from 'postcss-merge-longhand';
import postcssDiscardDuplicates from 'postcss-discard-duplicates';
import postcssDiscardOverridden from 'postcss-discard-overridden';
import postcssNormalizeRepeatStyle from 'postcss-normalize-repeat-style';
import postcssMergeRules from 'postcss-merge-rules';
import postcssDiscardEmpty from 'postcss-discard-empty';
import postcssUniqueSelectors from 'postcss-unique-selectors';
import postcssNormalizeString from 'postcss-normalize-string';
import postcssNormalizePositions from 'postcss-normalize-positions';
import postcssNormalizeWhitespace from 'postcss-normalize-whitespace';
import postcssNormalizeUnicode from 'postcss-normalize-unicode';
import postcssNormalizeDisplayValues from 'postcss-normalize-display-values';
import postcssNormalizeTimingFunctions from 'postcss-normalize-timing-functions';

const rawCache = postcss.plugin('cssnano-util-raw-cache', () => {
	return (css, result) => {
		result.root.rawCache = {
			colon: ':',
			indent: '',
			beforeDecl: '',
			beforeRule: '',
			beforeOpen: '',
			beforeClose: '',
			beforeComment: '',
			after: '',
			emptyBody: '',
			commentLeft: '',
			commentRight: ''
		};
	};
});

export default function cssnanoLite() {
	const plugins = [
		[discardComments],
		[postcssReduceInitial],
		[postcssReduceTransforms],
		[postcssConvertValues],
		[postcssCalc],
		[postcssColormin],
		[postcssOrderedValues],
		[postcssMinifySelectors],
		[postcssMinifyParams],
		[postcssMinifyFontValues],
		[postcssNormalizeUrl],
		[postcssMergeLonghand],
		[postcssDiscardDuplicates],
		[postcssDiscardOverridden],
		[postcssNormalizeRepeatStyle],
		[postcssMergeRules],
		[postcssDiscardEmpty],
		[postcssUniqueSelectors],
		[postcssNormalizeString],
		[postcssNormalizePositions],
		[postcssNormalizeWhitespace],
		[postcssNormalizeUnicode],
		[postcssNormalizeDisplayValues],
		[postcssNormalizeTimingFunctions],
		[rawCache]
	];
	return { plugins };
}
