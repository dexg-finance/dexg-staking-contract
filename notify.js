const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://localhost:7545");
const contract = require('truffle-contract');
const contractJson = require("./build/contracts/StakingDextoken.json");
const stakingContract = contract(contractJson);
stakingContract.setProvider(provider);

const address = process.env.STAKING_CONTRACT;
const owner = '0x7A57c3DC6eCaEba134ea33F8ce67BF60E8A9cAE9';
const account = '0x7A57c3DC6eCaEba134ea33F8ce67BF60E8A9cAE9';

async function start() {
	const stakingContractInstance = await stakingContract.at(address);

	let totalRewards = await stakingContractInstance.totalRewards({from: owner});
	console.log(`totalRewards... ${totalRewards}`);

	setInterval(async() => {
		console.log(`Notify... StakingDextoken::distributeRewards()`)
		await stakingContractInstance.distributeRewards({from: owner});

		let stakeOf = await stakingContractInstance.stakeOf(account, {from: owner});
		console.log(`stakeOf... ${stakeOf}`);

		let rewards = await stakingContractInstance.rewardOf(account, {from: owner});
		console.log(`rewardOf... ${rewards}`)
	}, 10000);
}

start();