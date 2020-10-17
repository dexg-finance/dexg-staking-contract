const Web3 = require('web3');
var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');
var BPT = artifacts.require('BPT');

var staking;
var stakingInstance;
var stakingContractAddress;

var token0;
var token0Instance; 
var token0ContractAddress;

var token1;
var token1Instance;
var token1ContractAddress;

var creator;
var user1;

// Utils
function toWei(amount) {
  return Web3.utils.toWei(amount.toString());
}

contract('Init', function(accounts,) {
  var now = parseInt(Date.now() / 1000);
  var start = now + 10;
  var end = start + 20;

  creator = accounts[0];
  user1 = accounts[1];

  it('should instantiate a token0 contract', async function() {
    token0Instance = await BPT.new();
    token0ContractAddress = token0Instance.address;
    assert.equal(typeof token0ContractAddress, 'string');
  });

  it('should instantiate a token1 contract', async function() {
    token1Instance = await Dextoken.new();
    token1ContractAddress = token1Instance.address;
    assert.equal(typeof token1ContractAddress, 'string');
  });

  it('should instantiate a staking contract', async function() {
    stakingInstance = await StakingDextoken.new(token0ContractAddress, token1ContractAddress);
    stakingContractAddress = stakingInstance.address;
    assert.equal(typeof stakingContractAddress, 'string');
  });

  it('should return a balance of 0 after staking contract deployment', function() {
    return token0Instance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance, 0);
    });
  });

  it('should be able to add minter', function() {
    return token0Instance.addMinter(creator).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should mint 6500 wei tokens to staking contract', function() {
    return token0Instance.mint(stakingContractAddress, toWei(6500)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 6500 wei after staking contract deployment', function() {
    return token0Instance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), toWei(6500));
    });
  });

  // start staking

  it('should set setStakingRound', function() {
    return stakingInstance.setRewardRound(1, toWei(5000), start, end).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  });

  it('should return a total origin rewards of 5000 wei from staking contract deployment', function() {
    return stakingInstance.totalRewards().then(function(balance) {
      assert.equal(balance.toString(10), toWei(5000));
    });
  });        
});