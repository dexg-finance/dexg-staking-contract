var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');

var ownerAccount;           // The default owner account. Should be accounts[0]

var staking;                  // The constructor promise of token contract
var stakingInstance;          // The token contract instance
var stakingContractAddress;   // The token contract address

var token;                  // The constructor promise of token contract
var tokenInstance;          // The token contract instance
var tokenContractAddress;   // The token contract address

var creator;
var user1;

var MAX_INT = 1000000000;

// Use me in localhost
var network = 'development';

// Utils
var BN = require('bn.js');
var decimals = '000000000000000000';

function wei(amount) {
  return '' + amount + decimals;
}

// Time period (UTC+0)
var now;
var start;
var end;

contract('Init', function(accounts,) {
  creator = accounts[0];
  user1 = accounts[1];

  it('should get deployed', async function() {
    // Deployed
    stakingInstance = await StakingDextoken.deployed();
    tokenInstance = await Dextoken.deployed();

    stakingContractAddress = stakingInstance.address;
    tokenContractAddress = tokenInstance.address;

    return assert.equal(!(!stakingInstance || !tokenInstance), true);
  });

  it('should return start timestamp', function() {
    return stakingInstance.getStartTimestamp().then(function(tx) {
      start = parseInt(tx.toString(10));
      assert.equal(true, true);
    });
  });

  it('should return end timestamp', async function() {
    let block = await web3.eth.getBlock("latest")
    now = parseInt(block.timestamp);

    return stakingInstance.getEndTimestamp().then(function(tx) {
      end = parseInt(tx.toString(10));

      console.log('start / end / now: ', start, end, now);        
      assert.equal(true, true);
    });
  });
});

contract('Staking', function(accounts,) {
  var isOpen = ((now > start) && (now < end)) ? true : false;

  it('should return a balance of 0 after staking contract deployment', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance, 0);
    });
  });

  it('should be able to add minter', function() {
    return tokenInstance.addMinter(creator).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should mint 6500 wei tokens to staking contract', function() {
    return tokenInstance.mint(stakingContractAddress, wei(6500)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 6500 wei after staking contract deployment', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(6500));
    });
  });

  // start staking

  it('should set 6500 wei rewards', function() {
    return stakingInstance.setRewards(wei(6500)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  });

  it('should return a total origin rewards of 6500 wei from staking contract deployment', function() {
    return stakingInstance.totalOriginalRewards().then(function(balance) {
      assert.equal(balance.toString(10), wei(6500));
    });
  });

  it('should be able to unpause', function() {
    return stakingInstance.unpause().then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  });

  it('should not be able to calculateRewardOf of 0', async function() {
    try {
      await stakingInstance.calculateRewardOf(creator);
      await stakingInstance.doRevert();
    } catch (error) {
      return assert.equal(true, true);
    }
    return assert.equal(false, true);    
  });

  it('should not be able to stake 100 wei, user balance is 0', async function() {
    try {
      await stakingInstance.deposit(wei(100));
      await stakingInstance.doRevert();
    } catch (error) {
      return assert.equal(true, true);
    }
    return assert.equal(false, true);        
  });

  // 1 stakeholder

  it('should be able to mint 10000 wei tokens to creator', function() {
    return tokenInstance.mint(creator, wei(10000)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 10000 wei of creator', function() {
    return tokenInstance.balanceOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), wei(10000));
    });
  });

  it('should not be able to stake 1000 wei, user balance is insufficient', async function() {
    try {
      await stakingInstance.deposit(wei(1000));
      await stakingInstance.doRevert();
    } catch (error) {
      return assert.equal(true, true);
    }
    return assert.equal(false, true);        
  });

  it('should be able to approve MAX_INT wei for the staking contract', function() {
    return tokenInstance.approve(stakingContractAddress, wei(MAX_INT)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should be able to stake 100 wei', function() {
    if (now > start) return console.log('deposit closed');

    return stakingInstance.deposit(wei(100)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 6600 wei after staking of user creator', function() {
    if (!isOpen) return console.log('deposit closed');

    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(6600));
    });
  });

  it('should return a stakes of 100 wei of the user', function() {
    if (!isOpen) return console.log('deposit closed');

    return stakingInstance.stakeOf(creator).then(function(stakes) {
      assert.equal(stakes.toString(10), wei(100));
    });
  }); 

  it('should return 6500 wei of totalOriginalRewards', function() {
    return stakingInstance.totalOriginalRewards().then(function(rewards) {
      assert.equal(rewards.toString(10), wei(6500));
    });
  }); 

  it('should return 6600 wei of calculateRewardOf of the user', function() {
    if (!isOpen) return console.log('Staking not open');

    return stakingInstance.calculateRewardOf(creator).then(function(rewards) {
      assert.equal(rewards.toString(10), wei(6500));
    });
  }); 


  // 2 stakeholders

  it('should be able to mint 500 wei tokens to user1', function() {
    return tokenInstance.mint(user1, wei(500)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 500 wei of user1', function() {
    return tokenInstance.balanceOf(user1).then(function(balance) {
      assert.equal(balance.toString(10), wei(500));
    });
  });

  it('should be able to approve MAX_INT wei for user1', async function() {
    return tokenInstance.approve(stakingContractAddress, wei(MAX_INT), { from: user1 }).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should deposit 400 wei', function() {
    if (now > start) return console.log('deposit closed');

    return stakingInstance.deposit(wei(400), { from: user1 }).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should balance 100 wei of user1', function() {
    if (!isOpen) return console.log('Staking not open');

    return tokenInstance.balanceOf(user1).then(function(balance) {
      assert.equal(balance.toString(10), wei(100));
    });
  });

  it('should return a balance of 7000 of staking contract', function() {
    if (!isOpen) return console.log('Staking not open');

    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(7000));
    });
  });

  it('should return a stakeOf of 400 wei of the user1', function() {
    if (!isOpen) return console.log('Staking not open');

    return stakingInstance.stakeOf(user1).then(function(stakes) {
      assert.equal(stakes.toString(10), wei(400));
    });
  }); 

  it('should return 1300 wei of calculateRewardOf of creator', function() {
    if (!isOpen) return console.log('Staking not open');

    return stakingInstance.calculateRewardOf(creator).then(function(rewards) {
      assert.equal(rewards.toString(10), wei(1300));
    });
  });
    
  // Distribute rewards
  it('should return a balance of staking contract', function() {
    if (!isOpen) return console.log('Staking not open');

    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(7000));
    });
  });

  it('should return 0 wei getWithdrawalOf creator', function() {
    return stakingInstance.getWithdrawalOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), 0);
    });
  });

  it('should return 0 wei getWithdrawalOf of user1', function() {
    return stakingInstance.getWithdrawalOf(user1).then(function(balance) {
      assert.equal(balance.toString(10), 0);
    });
  });

  it('should return getTotalStakes', function() {
    if (!isOpen) return console.log('Staking not open');

    return stakingInstance.getTotalStakes().then(function(balance) {
      assert.equal(balance.toString(10), wei('500'));
    });
  });         
});