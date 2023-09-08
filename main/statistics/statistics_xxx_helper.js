'use strict';
//08/09/23

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	try {include('..\\..\\helpers\\helpers_xxx_dummy.js');} catch(e) {bIncludeRel = false;}
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx_UI_flip.js');
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
	} else {
		include('statistics_xxx_helper_fallback.js');
	}
}