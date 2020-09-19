var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');
var moment = require('moment');

// Utils
var decimals = '000000000000000000';

function wei(amount) {
  return '' + amount + decimals;
}

module.exports = async function(deployer, network, [
	owner, account1, account2, account3, account4, account5
]) {
	let tokenInstance;
	let stakingInstance;

	// use UTC+0 time zone
	let now = moment().unix();
	let start = now + 1800;
	let end = start + 1800;

	if (network === 'development') {
		start = now + 1800;
		end = start + 300;
	}

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
 	await tokenInstance.mint(owner, wei(500));

    // Mint tokens
	if (network === 'development') {
		console.log(`Minting tokens for all users: '${account1}'`);        
 		await tokenInstance.mint(account1, wei(400));
 		await tokenInstance.mint(account2, wei(300));
 		await tokenInstance.mint(account3, wei(200));
 		await tokenInstance.mint(account4, wei(100));
 		await tokenInstance.mint(account5, wei(10));
	} else if (network === 'ropsten') {
		console.log(`Minting tokens for Ropsten users`); 
		await tokenInstance.mint('...', wei(3000));
		await tokenInstance.mint('...', wei(1200));       		
	}

 	// Unpause
    console.log(`Unpausing 'StakingDextoken'`);
    await stakingInstance.unpause();

    // Set rewards
    console.log(`Set rewards 6500`);
    await stakingInstance.setRewards(wei(6500)); 
};