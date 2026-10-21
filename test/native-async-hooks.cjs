// Jest 26 predates node: specifiers used by the locked Mongoose version.
// Load the real built-in through Node; authentication dependencies remain real.
module.exports = require('module').createRequire(__filename)('async_hooks');
