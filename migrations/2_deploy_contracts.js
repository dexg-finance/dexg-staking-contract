var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');

module.exports = function(deployer) {
	var now = parseInt(Date.now() / 1000);
	var start = now + 0;
	var end = start + 60;

	deployer.deploy(Dextoken).then(() => {
		return deployer.deploy(StakingDextoken, Dextoken.address, start, end);
	})
};