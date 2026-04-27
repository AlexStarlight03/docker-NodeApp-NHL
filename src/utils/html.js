function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function escapeJsonForScriptTag(value) {
	return JSON.stringify(value)
		.replaceAll("<", "\\u003c")
		.replaceAll(">", "\\u003e")
		.replaceAll("&", "\\u0026");
}

function formatDateTime(utcString) {
	if (!utcString) {
		return "N/A";
	}

	const date = new Date(utcString);
	if (Number.isNaN(date.getTime())) {
		return "N/A";
	}

	const timeZone = process.env.TIMEZONE || "America/Toronto";
	return new Intl.DateTimeFormat("fr-CA", {
		dateStyle: "short",
		timeStyle: "short",
		timeZone,
	}).format(date);
}

module.exports = {
	escapeHtml,
	escapeJsonForScriptTag,
	formatDateTime,
};