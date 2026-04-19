'use strict';
//19/04/26


include('helpers_xxx_global.js');
/* global globFonts:readable, globQuery:readable, soFeat:readable */

// Fonts: user replaceable with a presets file at folders.data
globFonts.tooltip = {name: soFeat.popup ? 'Tahoma' : 'Arial Unicode MS', size: 10};

// Query helpers
globQuery.recentBy = (time) => globQuery.lastPlayedFunc.replaceAll('#QUERYEXPRESSION#', 'DURING LAST ' +  time);