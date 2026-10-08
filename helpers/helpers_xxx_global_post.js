'use strict';
//07/10/26


include('helpers_xxx_global.js');
/* global globQuery:readable */

// Query helpers
globQuery.recentBy = (time) => globQuery.lastPlayedFunc.replaceAll('#QUERYEXPRESSION#', 'DURING LAST ' +  time);