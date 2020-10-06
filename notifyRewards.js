require('dotenv').config();
const moment = require('moment');
const Web3 = require('web3');
const provider = new Web3.providers.HttpProvider("http://localhost:7545");
const contract = require('truffle-contract');

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

	setInterval(async() => {
    	// Set rewards
    	console.log(`Send notifyRewards`);
    	await stakingContractInstance.notifyRewards({from: owner});
	}, 10000);
}

start();