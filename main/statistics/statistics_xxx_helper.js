'use strict';
//07/11/24

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	let Chroma, NatSort;
	try { include('..\\..\\helpers\\helpers_xxx_dummy.js'); } catch (e) { bIncludeRel = false; }
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_basic_js.js');
		include('..\\..\\helpers\\helpers_xxx_input.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
		/* global require:readable, module:readable */
		include('..\\..\\helpers\\helpers_xxx_prototypes_smp.js');
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx_UI_flip.js');
		include('..\\window\\window_xxx_button.js');
		Chroma = require('..\\helpers-external\\chroma.js\\chroma.min'); // Relative to helpers folder
		NatSort = require('..\\helpers-external\\natsort\\index.min'); // Relative to helpers folder
	} else {
		include('statistics_xxx_helper_fallback.js');
		Chroma = require('..\\..\\helpers-external\\chroma.js\\chroma.min'); // Relative to helpers folder
		NatSort = require('..\\..\\helpers-external\\natsort\\index.min'); // Relative to helpers folder
	}
	include('..\\..\\helpers\\popup_xxx.js');
	module.exports = { Chroma, NatSort };
}
const Chroma = module.exports.Chroma;
const NatSort = module.exports.NatSort;
module.exports = {};
/* exported Chroma, NatSort */