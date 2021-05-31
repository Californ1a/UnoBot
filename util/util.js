function getOpts(options) {
	const arr = [];
	const recurseOpts = (opt) => {
		if (!opt.type.match(/^(sub_command|sub_command_group)$/i)) {
			return {
				[opt.name]: opt.value,
			};
		}
		arr.push(opt.name);
		return {
			[opt.name]: opt.options.map(recurseOpts),
		};
	};
	const opts = options.map(recurseOpts).reduce((acc, obj) => {
		acc[Object.keys(obj)[0]] = obj[Object.keys(obj)[0]];
		return acc;
	}, {});
	for (let i = 0; i < arr.length; i += 1) {
		opts[arr[i]] = opts[arr[i]].reduce((acc, obj) => {
			acc[Object.keys(obj)[0]] = obj[Object.keys(obj)[0]];
			return acc;
		}, {});
	}
	return opts;
}

function getTimestamp(date) {
	const hr = date.getHours();
	const min = date.getMinutes();
	const hour = (`${hr}`.length < 2) ? `0${hr}` : hr;
	const minute = (`${min}`.length < 2) ? `0${min}` : min;
	return `${hour}:${minute}`;
}

module.exports = {
	getOpts,
	getTimestamp,
};
