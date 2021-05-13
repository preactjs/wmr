import React from 'react';
import ReactDOM from 'react-dom';
import compat from 'preact/compat';
import { options } from 'preact';

window.React = React;
window.ReactDOM = ReactDOM;
window.preactCompat = compat;

options.vnode = vnode => {
	if (vnode.type === 'div') {
		vnode.props.children = 'preact was used to render';
	}
};

ReactDOM.render(React.createElement('div', null, 'react was used to render'), document.body);
