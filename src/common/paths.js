const path = require('path');

const resolve = s => path.resolve(path.join(__dirname, s));

module.exports = {
	data: resolve('../../data'),
};
