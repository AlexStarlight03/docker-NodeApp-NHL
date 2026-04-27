function todayDate() {
	return new Date().toISOString().slice(0, 10);
}

function isValidDateString(value) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function moveDate(oldDate, days) {
	const date = new Date(`${oldDate}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

function getDate(value) {
	if (isValidDateString(String(value || ""))) {
		return String(value);
	}

	return todayDate();
}

module.exports = {
	todayDate,
	isValidDateString,
	moveDate,
	getDate,
};