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
const account = [
	process.env.ACCOUNT0, 
	process.env.ACCOUNT1, 
	process.env.ACCOUNT2
];

function toWei(amount) {
  return Web3.utils.toWei(amount.toString());
}

function fromWei(amount) {
  return Web3.utils.fromWei(amount.toString());
}

const id = parseInt(process.argv[2]);
const amount = parseFloat(process.argv[3]);

async function start() {
	const stakingContractInstance = await stakingContractRegistry.at(stakingContract);
	const stakingTokenInstance = await stakingTokenRegistry.at(stakingToken);

	console.log(`account${id}: unstake ${amount}`);
	await stakingContractInstance.withdraw(toWei(amount), {from: account[id]});
}

start();