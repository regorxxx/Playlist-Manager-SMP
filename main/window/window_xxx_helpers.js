'use strict';
//11/03/25

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	try { include('..\\..\\helpers\\helpers_xxx_dummy.js'); } catch (e) { bIncludeRel = false; } // eslint-disable-line no-unused-vars
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes_smp.js');
		include('..\\..\\helpers\\menu_xxx.js');
	} else {
		include('window_xxx_helpers_fallback.js');
		include('menu_xxx.js');
		include(fb.ComponentPath + 'docs\\Flags.js');
	}
}
