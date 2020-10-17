require('dotenv').config();
const Web3 = require('web3');

//
const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');
const mnemonic = fs.readFileSync(".secrets").toString().trim();
const provider1 = new HDWalletProvider(mnemonic, "https://ropsten.infura.io/v3/" + process.env.INFURA_PROJECT_ID);
//
const provider2 = new Web3.providers.HttpProvider("http://localhost:7545");
const contract = require('truffle-contract');
//
const provider = provider1;

const stakingContractJson = require("./build/contracts/StakingDextoken.json");
const stakingContractRegistry = contract(stakingContractJson);
stakingContractRegistry.setProvider(provider);

const stakingTokenJson = require("./build/contracts/BPT.json");
const stakingTokenRegistry = contract(stakingTokenJson);
stakingTokenRegistry.setProvider(provider);

const stakingContract = process.env.VUE_APP_LUNA_STAKING_CONTRACT_ADDRESS;
const stakingToken = process.env.VUE_APP_LUNA_STAKING_TOKEN_ADDRESS;
const owner = process.env.ACCOUNT0;
const account1 = process.env.ACCOUNT1;
const account2 = process.env.ACCOUNT2;

function toWei(amount) {
  return Web3.utils.toWei(amount.toString());
}

function fromWei(amount) {
  return Web3.utils.fromWei(amount.toString());
}

async function start() {
	const stakingContractInstance = await stakingContractRegistry.at(stakingContract);
	const stakingTokenInstance = await stakingTokenRegistry.at(stakingToken);

    // Deposit: owner
    console.log(`owner: Approve`);
    await stakingTokenInstance.approve(stakingContract, toWei(10000000), {from: owner});
    console.log(`owner: Deposit`);
    await stakingContractInstance.deposit(toWei('500'), {from: owner});	

    console.log(`account1: Approve`);
    await stakingTokenInstance.approve(stakingContract, toWei(10000000), {from: account1});
    console.log(`account1: Deposit`);
    await stakingContractInstance.deposit(toWei('500'), {from: account1});

    console.log(`account2: Approve`);
    await stakingTokenInstance.approve(stakingContract, toWei(10000000), {from: account2});
    console.log(`account2: Deposit`);
    await stakingContractInstance.deposit(toWei('500'), {from: account2});

	setInterval(async() => {
		let totalRewards = await stakingContractInstance.totalRewards({from: owner});
		console.log(`TotalRewards... ${fromWei(totalRewards)}`);

		let stakeOf1 = await stakingContractInstance.stakeOf(owner, {from: owner});
		console.log(`  stakeOf owner... ${fromWei(stakeOf1)}`);

		let stakeOf2 = await stakingContractInstance.stakeOf(account1, {from: account1});
		console.log(`  stakeOf account1... ${fromWei(stakeOf2)}`);

		let rewards1 = await stakingContractInstance.rewardOf(owner, {from: owner});
		console.log(`  rewardOf owner... ${fromWei(rewards1)}`);

		let rewards2 = await stakingContractInstance.rewardOf(account1, {from: account1});
		console.log(`  rewardOf account1... ${fromWei(rewards2)}`);

		let rewards3 = await stakingContractInstance.rewardOf(account2, {from: account2});
		console.log(`  rewardOf account2... ${fromWei(rewards3)}`);

		let remainingRewards = await stakingContractInstance.remainingRewards({ from: owner });
		console.log(`  remaining reward... ${remainingRewards}`);	
	}, 10000);
}

start();
