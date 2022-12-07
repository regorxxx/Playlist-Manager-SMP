'use strict';
//25/11/22

/* 
	FbTitleFormat
*/
// Add async calculation
FbTitleFormat.prototype.EvalWithMetadbsAsync = function EvalWithMetadbsAsync(handleList, slice = 1000) {
	const size = handleList.Count;
	return new Promise(async (resolve) => {
		const items = handleList.Convert();
		const count = items.length;
		const total = Math.ceil(size / slice);
		const tags = [];
		let prevProgress = -1;
		for (let i = 1; i <= total; i++) {
			await new Promise((resolve) => {
				setTimeout(() => {
					const iItems = new FbMetadbHandleList(items.slice((i - 1) * slice, i === total ? count : i * slice));
					tags.push(...this.EvalWithMetadbs(iItems));
					const progress = Math.round(i / total * 100);
					if (progress % 25 === 0 && progress > prevProgress) {prevProgress = progress; console.log('EvalWithMetadbsAsync ' + _p(this.Expression) + ' ' + progress + '%.');}
					resolve('done');
				}, 25);
			});
		}
		resolve(tags);
	});
}

{	// Augment fb.TitleFormat with 'Expression' property
	const old = fb.TitleFormat;
	fb.TitleFormat = function TitleFormat() {
		const that = old.apply(fb, [...arguments]);
		that.Expression = arguments[0];
		return that;
	}
}

{	// Augment FbTitleFormat with 'Expression' property
	const old = FbTitleFormat;
	FbTitleFormat = function FbTitleFormat() {
		const that = old(...arguments);
		that.Expression = arguments[0];
		return that;
	}
}