/*
  Meant to be called by name on json files or other external tools to limit eval usage.
*/

const funcDict = {todayDate};

function todayDate() {
	let today = new Date();
	let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
	let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
	return date + ' ' + time;
}