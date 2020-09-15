var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');

module.exports = async function(deployer) {
	var now = parseInt(Date.now() / 1000);
	var start = now + 10;
	var end = start + 30;

	return deployer.deploy(Dextoken).then(() => {
		return deployer.deploy(StakingDextoken, Dextoken.address, start, end);
	});	
};