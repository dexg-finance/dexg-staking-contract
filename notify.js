require('dotenv').config();
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://localhost:7545");
const contract = require('truffle-contract');

const stakingContractJson = require("./build/contracts/StakingDextoken.json");
const stakingContractRegistry = contract(stakingContractJson);
stakingContractRegistry.setProvider(provider);

const stakingTokenJson = require("./build/contracts/BPT.json");
const stakingTokenRegistry = contract(stakingTokenJson);
stakingTokenRegistry.setProvider(provider);

const stakingContract = process.env.VUE_APP_STAKING_CONTRACT_ADDRESS;
const stakingToken = process.env.VUE_APP_STAKING_TOKEN_ADDRESS;
const owner = process.env.ACCOUNT0;
const account1 = process.env.ACCOUNT1;
const account = owner;

function toWei(amount) {
  return Web3.utils.toWei(amount.toString());
}

function fromWei(amount) {
  return Web3.utils.fromWei(amount.toString());
}

async function start() {
	const stakingContractInstance = await stakingContractRegistry.at(stakingContract);
	const stakingTokenInstance = await stakingTokenRegistry.at(stakingToken);

	// 
	let totalRewards = await stakingContractInstance.totalRewards({from: owner});
	console.log(`totalRewards... ${totalRewards}`);

    // Deposit: owner
    console.log(`owner: Approve`);
    await stakingTokenInstance.approve(stakingContract, toWei(10000000), {from: owner});
    console.log(`owner: Deposit`);
    await stakingContractInstance.deposit(toWei(125.837465), {from: owner});	

    console.log(`account1: Approve`);
    await stakingTokenInstance.approve(stakingContract, toWei(10000000), {from: account1});
    console.log(`account1: Deposit`);
    await stakingContractInstance.deposit(toWei(0.912837), {from: account1});

	setInterval(async() => {
		console.log(`Notify... StakingDextoken::distributeRewards()`)
		await stakingContractInstance.notifyDistributeRewards({from: owner});

		let stakeOf = await stakingContractInstance.stakeOf(account, {from: owner});
		console.log(`stakeOf... ${stakeOf}`);

		let rewards1 = await stakingContractInstance.rewardOf(account, {from: owner});
		console.log(`rewardOf owner... ${fromWei(rewards1)}`);

		let rewards2 = await stakingContractInstance.rewardOf(account1, {from: account1});
		console.log(`rewardOf account1... ${fromWei(rewards2)}`);

		let issued = parseFloat(fromWei(rewards1))+parseFloat(fromWei(rewards2));

		console.log(`reward issued... ${issued}`);

		if (parseFloat(fromWei(stakeOf)) > 0) {
	    	console.log(`account1: unstake`);
	    	await stakingContractInstance.withdraw(toWei(5.12), {from: owner});		
		}

		//if (parseFloat(fromWei(stakeOf)) <= 10) {
	    //	console.log(`account1: stake`);
	    //	await stakingContractInstance.deposit(toWei(10), {from: owner});		
		//}		
	}, 10000);
}

start();