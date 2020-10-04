const Web3 = require('web3');
const StakingDextoken = artifacts.require('StakingDextoken');
const BPT = artifacts.require('BPT');
const Dextoken = artifacts.require('Dextoken');
const moment = require('moment');
const fs = require('fs');

function wei(amount) {
  return Web3.utils.toWei(amount.toString());
}

module.exports = async function(deployer, network, [
	owner, account1, account2, account3, account4, account5
]) {
	let stakingTokenInstance;
	let rewardTokenInstance;	
	let stakingContractInstance;

	// use UTC+0 time zone
	let now = moment.utc().unix();
	let start = now + 1800;
	let end = start + 3600;

	if (network === 'development') {
		start = now + 300;
		end = start + 60;
	}

    // Deploy the BPT token Contract
	await deployer.deploy(BPT);
    stakingTokenInstance = await BPT.deployed();

    // Deploy the Dextoken Contract
	await deployer.deploy(Dextoken);
    rewardTokenInstance = await Dextoken.deployed();

    // Deploy the StakingDextoken Contract
    await deployer.deploy(StakingDextoken, BPT.address, Dextoken.address);
    stakingContractInstance = await StakingDextoken.deployed();

    const data = 
    `VUE_APP_STAKING_TOKEN_ADDRESS=${BPT.address}\n` +
    `VUE_APP_REWARD_TOKEN_ADDRESS=${Dextoken.address}\n` +
    `VUE_APP_STAKING_CONTRACT_ADDRESS=${StakingDextoken.address}\n` +
    `ACCOUNT0=${owner}\n` +
    `ACCOUNT1=${account1}\n` +
    `ACCOUNT2=${account2}\n`;

    fs.writeFileSync('.env', data);

    // Staking Token: Add minter
    console.log(`Staking Token: Add minter ${owner}`);
    await stakingTokenInstance.addMinter(owner);

    // Staking Token: Mint tokens
	console.log(`Staking Token: Minting 50 tokens for owner: '${owner}'`);        
 	await stakingTokenInstance.mint(owner, wei(1000));

    // Reward Token: Add minter
    console.log(`Reward Token: Add minter ${owner}`);
    await rewardTokenInstance.addMinter(owner);

    // Reward Token: Mint tokens
	console.log(`Reward Token: Minting 5000 tokens for address: '${StakingDextoken.address}'`);        
 	await rewardTokenInstance.mint(StakingDextoken.address, wei(10000));

    // Mint tokens
	if (network === 'development') {
		console.log(`Staking Token: Minting tokens for all users: '${account1}'`);        
 		await stakingTokenInstance.mint(account1, wei(1000));
 		await stakingTokenInstance.mint(account2, wei(1000));
 		await stakingTokenInstance.mint(account3, wei(1000));
 		await stakingTokenInstance.mint(account4, wei(1000));
 		await stakingTokenInstance.mint(account5, wei(1000));
	} else if (network === 'ropsten') {
		console.log(`Staking Token: Minting tokens for Ropsten users`); 
		await stakingTokenInstance.mint('...', wei(100));
		await stakingTokenInstance.mint('...', wei(200));       		
	}

	await stakingContractInstance.pause(); 
	await stakingContractInstance.unpause(); 
};