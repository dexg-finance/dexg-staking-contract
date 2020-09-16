var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');

// Utils
var decimals = '000000000000000000';

function wei(amount) {
  return '' + amount + decimals;
}

module.exports = async function(deployer, network, [owner, account1]) {
	let tokenInstance;
	let stakingInstance;

	let now = parseInt(Date.now() / 1000);
	let start = now + 10;
	let end = start + 30;

    // Deploy the Dextoken Contract
	await deployer.deploy(Dextoken);
    tokenInstance = await Dextoken.deployed();

    // Deploy the StakingDextoken Contract
    await deployer.deploy(StakingDextoken, Dextoken.address, start, end);
    stakingInstance = await StakingDextoken.deployed();

    // Add minter
    console.log(`Add minter ${owner}`);
    await tokenInstance.addMinter(owner);

    // Mint tokens
	console.log(`Minting 6500 tokens for address: '${StakingDextoken.address}'`);        
 	await tokenInstance.mint(StakingDextoken.address, wei(6500));

    // Mint tokens
	console.log(`Minting 500 tokens for owner: '${owner}'`);        
 	await tokenInstance.mint(owner, wei(1500));

    // Mint tokens
	console.log(`Minting 500 tokens for account1: '${account1}'`);        
 	await tokenInstance.mint(account1, wei(500));

 	// Unpause
    console.log(`Unpausing 'StakingDextoken'`);
    await stakingInstance.unpause();

    // Set rewards
    console.log(`Set rewards 6500`);
    await stakingInstance.setRewards(wei(6500)); 
};