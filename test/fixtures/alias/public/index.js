import React from 'react';
import Compat from 'preact/compat';

const text = `Aliasing ${React === Compat ? 'works' : 'does NOT work'}.`;
document.body.textContent = text;
