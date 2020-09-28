require('dotenv').config();
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://localhost:7545");
const contract = require('truffle-contract');
const contractJson = require("./build/contracts/StakingDextoken.json");
const stakingContract = contract(contractJson);
stakingContract.setProvider(provider);

const address = process.env.VUE_APP_STAKING_CONTRACT_ADDRESS;
const owner = process.env.ACCOUNT0;
const account = owner;

async function start() {
	const stakingContractInstance = await stakingContract.at(address);

	let totalRewards = await stakingContractInstance.totalRewards({from: owner});
	console.log(`totalRewards... ${totalRewards}`);

	setInterval(async() => {
		console.log(`Notify... StakingDextoken::distributeRewards()`)
		await stakingContractInstance.notifyDistributeRewards({from: owner});

		let stakeOf = await stakingContractInstance.stakeOf(account, {from: owner});
		console.log(`stakeOf... ${stakeOf}`);

		let rewards = await stakingContractInstance.rewardOf(account, {from: owner});
		console.log(`rewardOf... ${rewards}`)
	}, 10000);
}

start();