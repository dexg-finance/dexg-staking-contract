pragma solidity 0.5.17;

import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";

import "./Pausable.sol";


contract StakingDextoken is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    event Freeze(address indexed account);
    event Unfreeze(address indexed account);
    event TokenDeposit(address account, uint amount);
    event TokenWithdraw(address account, uint amount);
    event TokenClaim(address account, uint amount);

    uint public rewardRate = 0;

    // User award balance
    mapping(address => uint) public rewards;
    mapping(address => uint) public userRewardPerTokenPaid;
    mapping(address => uint) public lastRewardTime;
    mapping(address => uint) public lastUpdateTime;
    mapping(address => uint) public rewardPerTokenStored;

    uint private _start;
    uint private _end;
    uint private _duration;

    /// Staking token
    IERC20 private _token0;

    /// Reward token
    IERC20 private _token1;

    /// Total rewards
    uint private _rewards;

    /// Total amount of user staking tokens
    uint private _totalSupply;

    mapping(address => bool) public frozenAccount;

    /// The staking users
    mapping(address => bool) public stakeHolders;

    /// The amount of tokens staked
    mapping(address => uint) private _balances;        

    /// The total stake shares of all stakeholders
    mapping(address => uint) internal totalShares;

    /// The remaining withdrawals of staked tokens
    mapping(address => uint) internal withdrawalOf;  

    /// The remaining withdrawals of reward tokens
    mapping(address => uint) internal claimOf;

    constructor (address token0, address token1) public {
        require(token0 != address(0), "DEXToken: zero address");
        require(token1 != address(0), "DEXToken: zero address");

        _token0 = IERC20(token0);
        _token1 = IERC20(token1);
    }

    modifier notFrozen(address _account) {
        require(!frozenAccount[_account]);
        _;
    }

    function earned(address account) internal view returns (uint) {   
        return rewardPerTokenStored[account];
    }

    function rewardPerToken(address _stakeholder) public view returns (uint) {     
        if (_totalSupply == 0) {
            return rewardPerTokenStored[_stakeholder];
        }
        uint ticks = lastUpdateTime[_stakeholder].sub(lastRewardTime[_stakeholder]);
        return ticks.mul(rewardRate).div(_totalSupply);
    }

    function notifyDistributeRewards() public nonReentrant {
        lastUpdateTime[msg.sender] = Math.min(block.timestamp, _end);
        lastUpdateTime[address(this)] = Math.min(block.timestamp, _end);
        distributeRewards(msg.sender);               
    }

    function distributeRewards(address _stakeholder) internal returns (bool) {
        if (lastRewardTime[_stakeholder] >= _end)  {
            return false;
        }
        // staking not started
        if (lastUpdateTime[_stakeholder] <=  lastRewardTime[_stakeholder]) {
            return false;
        }
        rewardPerTokenStored[_stakeholder] = rewardPerToken(_stakeholder);
        rewardPerTokenStored[address(this)] = rewardPerToken(address(this));

        rewards[_stakeholder] = earned(_stakeholder).mul(_balances[_stakeholder]).add(rewards[_stakeholder]);
        rewards[address(this)] = earned(address(this)).add(rewards[address(this)]);

        lastRewardTime[_stakeholder] = lastUpdateTime[_stakeholder];
        lastRewardTime[address(this)] = lastUpdateTime[address(this)];
        return true;
    }

    function setRewardPeriod(uint amount, uint start, uint end) external onlyOwner returns (bool) {
        require(block.timestamp < start, "setRewardPeriod: can not override start");
        require(start < end, "DEXToken: invalid end time");
        require(amount > 0, "setRewards: invalid amount");
        // `amount` should be equal to the amount of tokens that are intended for reward
        require(_token1.balanceOf(address(this)) == amount, "setRewards: insufficient reward balance");
        _start = start;   
        _end = end;  
        _duration = end.sub(start);  
        _rewards = amount;
        rewardRate = _rewards.mul(1e18);
        return true;
    }

    function addStakeholder(address _stakeholder) internal {
        stakeHolders[_stakeholder] = true;
    }

    function removeStakeholder(address _stakeholder) internal {
        stakeHolders[_stakeholder] = false;
    }

    /// Deposit staking tokens
    function deposit(uint amount) 
        external 
        nonReentrant
        whenNotPaused 
        notFrozen(msg.sender) 
    {
        require(block.timestamp <= _end, "deposit: staking ends");
        require(amount > 0, "deposit: cannot stake 0");
        require(msg.sender != address(0), "withdraw: zero address");
        require(_token0.balanceOf(msg.sender) >= amount, "deposit: insufficient balance");
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _totalSupply = _totalSupply.add(amount);  
        addStakeholder(msg.sender);
        lastRewardTime[msg.sender] = Math.max(block.timestamp, _start);
        lastRewardTime[address(this)] = Math.max(block.timestamp, _start);    
        distributeRewards(msg.sender);
        _token0.safeTransferFrom(msg.sender, address(this), amount);
        emit TokenDeposit(msg.sender, amount);
    }

    /// Withdraw staked tokens
    function withdraw(uint amount) 
        external 
        nonReentrant
        whenNotPaused 
        notFrozen(msg.sender) 
    {
        require(amount > 0, "withdraw: amount invalid");
        require(msg.sender != address(0), "withdraw: zero address");
        /// Not overflow
        require(_balances[msg.sender] >= amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        _totalSupply = _totalSupply.sub(amount);        
        /// Keep track user withdraws
        withdrawalOf[msg.sender] = withdrawalOf[msg.sender].add(amount);  
        if (_balances[msg.sender] == 0) {
            removeStakeholder(msg.sender);   
        }
        lastUpdateTime[msg.sender] = Math.min(block.timestamp, _end);
        lastUpdateTime[address(this)] = Math.min(block.timestamp, _end);
        distributeRewards(msg.sender);
        _token0.safeTransfer(msg.sender, amount);
        emit TokenWithdraw(msg.sender, amount);
    }

    /// Claim reward tokens
    function claim(uint amount) 
        external 
        nonReentrant
        whenNotPaused 
        notFrozen(msg.sender) 
    {
        require(amount > 0, "withdraw: amount invalid");
        require(block.timestamp > _end, "claim: staking not ended");        
        /// Not overflow
        require(_token1.balanceOf(address(this)) >= amount, "claim: insufficient balance");
        ///
        uint remaining = rewardOf(msg.sender).sub(claimOf[msg.sender]);
        require(remaining >= amount, "claim: invalid amount");
        /// Keep track user withdraws
        claimOf[msg.sender] = claimOf[msg.sender].add(amount);  
        _token1.safeTransfer(msg.sender, amount);
        emit TokenClaim(msg.sender, amount);
    }

    function freezeAccount(address account) external onlyOwner returns (bool) {
        require(!frozenAccount[account], "ERC20: account frozen");
        frozenAccount[account] = true;
        emit Freeze(account);
        return true;
    }

    function unfreezeAccount(address account) external onlyOwner returns (bool) {
        require(frozenAccount[account], "ERC20: account not frozen");
        frozenAccount[account] = false;
        emit Unfreeze(account);
        return true;
    }

    function getRewards() external view returns (uint) {
        return _rewards;
    }

    function getWithdrawalOf(address _stakeholder) external view returns (uint) {
        return withdrawalOf[_stakeholder];
    }

    function getClaimOf(address _stakeholder) external view returns (uint) {
        return claimOf[_stakeholder];
    }

    function getDuration() external view returns (uint) {
        return _duration;
    }

    function getStartTimestamp() external view returns (uint) {
        return _start;
    }

    function getEndTimestamp() external view returns (uint) {
        return _end;
    }

    /// Get remaining rewards of the time period
    function remainingRewards() external view returns(uint) {
        require(block.timestamp >= _start, "staking not open");
        require(block.timestamp <= _end, "staking ended");
        (uint _total) = totalRewards();
        (uint _currentDuration) = _end.sub(block.timestamp);
        return _total.mul(_currentDuration).div(_duration);
    }

    /// Retrieve the stake for a stakeholder
    function stakeOf(address _stakeholder) public view returns (uint) {
        return _balances[_stakeholder];
    }

    /// Retrieve the stake for a stakeholder
    function rewardOf(address _stakeholder) public view returns (uint) {
        uint reward = rewards[_stakeholder];
        /// staking over all time
        if (stakeHolders[_stakeholder] == true && reward == 0) {
            reward = _balances[_stakeholder].mul(rewards[address(this)]);
        }
        return reward.div(1e18).div(_duration);
    }

    /// The stakes of all stakeholders
    function getTotalStakes() public view returns (uint) {
        return _totalSupply;
    }

    /// Get total original rewards
    function totalRewards() public view returns (uint) {
        return _rewards;
    }  
}   