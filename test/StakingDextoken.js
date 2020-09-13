var StakingDextoken = artifacts.require('StakingDextoken');
var Dextoken = artifacts.require('Dextoken');

var ownerAccount;           // The default owner account. Should be accounts[0]

var staking;                  // The constructor promise of token contract
var stakingInstance;          // The token contract instance
var stakingContractAddress;   // The token contract address

var token;                  // The constructor promise of token contract
var tokenInstance;          // The token contract instance
var tokenContractAddress;   // The token contract address

var MAX_INT = 1000000000;

// Use me in localhost
var network = 'development';

contract('StakingDextoken', function(accounts,) {
  var BN = require('bn.js');
  var decimals = '000000000000000000';

  function wei(amount) {
    return '' + amount + decimals;
  }

  creator = accounts[0];
  user1 = accounts[1];

  it('should instantiate a token contract', function() {
    token = Dextoken.new();
    // Wait for the token contract.
    // The amount of total supply gives to the creator. The contract calls transfer
    // from the address 0x0, therefore, we have to wait until the instantiatation finish.
    return token.then(function(instance) {
      tokenInstance = instance;
      tokenContractAddress = instance.address;
      assert.equal(typeof tokenContractAddress, 'string');
    });
  });

  it('should instantiate a staking contract', function() {
    var now = parseInt(Date.now() / 1000);
    var start = now + 10;
    var end = start + 20;

    staking = StakingDextoken.new(tokenContractAddress, start, end);
    return staking.then(function(instance) {
      stakingInstance = instance;
      stakingContractAddress = instance.address;
      assert.equal(typeof tokenContractAddress, 'string');
    });
  });

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

  it('should be able to mint 10000 wei tokens to user', function() {
    return tokenInstance.mint(creator, wei(10000)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should return a balance of 10000 wei after staking contract deployment', function() {
    return tokenInstance.balanceOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), wei(10000));
    });
  });

  it('should not be able to stake 200 wei, user balance is insufficient', async function() {
    try {
      await stakingInstance.deposit(wei(200));
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
    return stakingInstance.deposit(wei(100)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 


  it('should return a balance of 6600 wei after staking contract deployment', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(6600));
    });
  });

  it('should return a stakes of 100 wei of the user', function() {
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
    return stakingInstance.deposit(wei(400), { from: user1 }).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  }); 

  it('should balance 100 wei of user1', function() {
    return tokenInstance.balanceOf(user1).then(function(balance) {
      assert.equal(balance.toString(10), wei(100));
    });
  });

  it('should return a balance of 7000 of staking contract', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei(7000));
    });
  });

  it('should return a stakeOf of 400 wei of the user1', function() {
    return stakingInstance.stakeOf(user1).then(function(stakes) {
      assert.equal(stakes.toString(10), wei(400));
    });
  }); 

  it('should return 1300 wei of calculateRewardOf of creator', function() {
    return stakingInstance.calculateRewardOf(creator).then(function(rewards) {
      assert.equal(rewards.toString(10), wei(1300));
    });
  });
    
  // Distribute rewards
  it('should return a balance of staking contract', function() {
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
    return stakingInstance.getTotalStakes().then(function(balance) {
      assert.equal(balance.toString(10), wei('500'));
    });
  });

  // await
  mineBlock = async() => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err); }
        const block = web3.eth.getBlock('latest');
        return resolve(block)
      });
    });
  };

  // Mine 12 new blocks
  let newBlock = {};  
  let blocksToMine = 6;

  async function mining() {
    const currentBlock = await web3.eth.getBlock('latest');
    while (blocksToMine-- > 0) {
      newBlock = await mineBlock();
    }
  }

  it('should withdraw 100 of creator', function() {
    return stakingInstance.withdraw(wei(100), { from: creator }).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  });  

  it('should return balance 6900 wei of stakingContractAddress', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei('6900'));
    });
  });  

  it('should return getFundsOf 1400 wei of creator', function() {
    return stakingInstance.getFundsOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), wei('1400'));
    });
  });  

  it('should return getWithdrawableOf 100 wei of creator', function() {
    return stakingInstance.getWithdrawalOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), wei('100'));
    });
  });  

  it('should withdraw 1300 of creator', function() {
    return stakingInstance.withdraw(wei(1300)).then(function(tx) {
      assert.equal(tx.receipt.status, true);
    });
  });  

  it('should return getWithdrawableOf 0 wei of creator', function() {
    return stakingInstance.getWithdrawalOf(creator).then(function(balance) {
      assert.equal(balance.toString(10), wei(1400));
    });
  }); 

  it('should return balance 5600 wei of stakingContractAddress', function() {
    return tokenInstance.balanceOf(stakingContractAddress).then(function(balance) {
      assert.equal(balance.toString(10), wei('5600'));
    });
  });              
});







