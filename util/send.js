function sendM(chan, msg, options) {
	return new Promise((resolve, reject) => {
		if (options) {
			chan.send(msg, options).then((m) => {
				resolve(m);
			}).catch((e) => {
				reject(e);
			});
		} else {
			chan.send(msg).then((m) => {
				resolve(m);
			}).catch((e) => {
				reject(e);
			});
		}
	});
}

function send(chan, msg, options) {
	return new Promise((resolve, reject) => {
		const channel = (chan.content) ? ((chan.guild) ? chan.channel : chan.author) : chan;
		sendM(channel, msg, options).then((m) => {
			resolve(m);
		}).catch((e) => {
			reject(e);
		});
	});
}

module.exports = send;
