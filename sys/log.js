var format = require("util").format

function DateToShortString(date)
{
	var day = date.getDate().toString();
	if(day.length < 2) day = "0" + day;

	var month = date.getMonth().toString();
	if(month.length < 2) month = "0" + month;

	var year = date.getFullYear().toString();

	var hour = date.getHours().toString();
	if(hour.length < 2) hour = "0" + hour;

	var minute = date.getMinutes().toString();
	if(minute.length < 2) minute = "0" + minute;

	var second = date.getSeconds().toString();
	if(second.length < 2) second = "0" + second;

	/* Looks like 14/12/1995 13:37:00 */
	return day + "/" + month + "/" + year + " " + hour + ":" + minute + ":" + second;
};

module.exports.logf = function() {
	console.log("[" + DateToShortString(new Date()) + "] " + format.apply(null, arguments));
};
