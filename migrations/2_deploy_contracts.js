var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');
var moment = require('moment');

module.exports = function(deployer) {
	// Use a pre-defined timestamp (local time) to simply the test, https://www.epochconverter.com/
	var start = 1600163700;
	var end = start + 60;

	deployer.deploy(Dextoken).then(() => {
		return deployer.deploy(StakingDextoken, Dextoken.address, start, end);
	})
};