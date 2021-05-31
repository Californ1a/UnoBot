function sleep(min, max) {
	return new Promise((resolve, reject) => {
		if (min && !max) {
			setTimeout(resolve, min);
		} else if (min && max) {
			const rand = Math.floor(Math.random() * (max - min + 1) + min);
			setTimeout(resolve, rand);
		} else {
			reject(new Error("No time specified"));
		}
	});
}

module.exports = sleep;
