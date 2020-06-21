module.exports = {
	get watch() {
		return require('fsevents/fsevents.js').watch;
	},
	get getInfo() {
		return require('fsevents/fsevents.js').getInfo;
	},
	get constants() {
		return require('fsevents/fsevents.js').constants;
	}
};
