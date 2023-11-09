'use strict';
//03/11/23

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	try {include('..\\..\\helpers\\helpers_xxx_dummy.js');} catch(e) {bIncludeRel = false;}
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
	} else {
		include('window_xxx_helpers_fallback.js');
	}
}
