function countOccurrences(arr, val) {
	if (!val) {
		return arr.reduce((prev, curr) => (prev[curr] = ++prev[curr] || 1, prev), {}); // eslint-disable-line
	}
	return arr.reduce((a, v) => (v === val ? a + 1 : a), 0);
}

module.exports = countOccurrences;
