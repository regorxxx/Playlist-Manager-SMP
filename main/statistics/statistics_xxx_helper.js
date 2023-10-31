'use strict';
//08/09/23

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	try {include('..\\..\\helpers\\helpers_xxx_dummy.js');} catch(e) {bIncludeRel = false;}
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_basic_js.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes_smp.js');
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx_UI_flip.js');
		include('..\\window\\window_xxx_button.js');
		require('..\\helpers-external\\chroma.js-2.4.0\\chroma'); // Relative to helpers folder
	} else {
		include('statistics_xxx_helper_fallback.js');
		require('..\\..\\helpers-external\\chroma.js-2.4.0\\chroma'); // Relative to helpers folder
	}
	include('..\\..\\helpers\\popup_xxx.js');
}