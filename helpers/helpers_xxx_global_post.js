'use strict';
//21/11/24


include('helpers_xxx_global.js');
/* global globFonts:readable, globQuery:readable, soFeat:readable */

// Fonts: user replaceable with a presets file at folders.data
globFonts.tooltip = {name: !soFeat.popup ? 'Arial Unicode MS' : 'Tahoma', size: 10};

// Query helpers
globQuery.recentBy = (time) => globQuery.recent.replace(/(\d*) (SECOND|MINUTE|HOUR|WEEK|DAY)s?/gi, time);