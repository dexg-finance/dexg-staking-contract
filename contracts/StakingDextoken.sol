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

    uint public rewardPerTokenStored = 0;
    uint public lastUpdateTime = 0;
    uint public lastRewardTime = 0;
    uint public rewardRate = 0;

    // User award balance
    mapping(address => uint) public rewards;
    mapping(address => uint) public userRewardPerTokenPaid;

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
    address[] internal stakeHolders;

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

    function earned(address account) public view returns (uint) {
        return _balances[account].mul(rewardPerTokenStored).div(_totalSupply).add(rewards[account]);
    }

    function lastTimeRewardApplicable() public view returns (uint) {
        if (block.timestamp < _start) {
            return _start;
        }
        if (block.timestamp > _end) {
            return _end;
        }        
        return block.timestamp;
    }

    function rewardPerToken() public view returns (uint) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint ticks = lastRewardTime.sub(lastUpdateTime);
        return ticks.mul(rewardRate);
    }

    function notifyDistributeRewards() public onlyOwner nonReentrant returns (bool) {
        distributeRewards();
        return true;
    }

    function distributeRewards() internal returns (bool) {
        lastRewardTime = lastTimeRewardApplicable();
        rewardPerTokenStored = rewardPerToken();
        for (uint i = 0; i < stakeHolders.length; i++) {
            if (stakeHolders[i] != address(0)) { 
                rewards[stakeHolders[i]] = earned(stakeHolders[i]);
            }
        }
        lastUpdateTime = lastRewardTime;   
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
        lastUpdateTime = _start;  
        lastRewardTime = _start;
        rewardRate = _rewards.div(_duration);
        return true;
    }

    function isStakeholder(address _address) public view returns(bool, uint) {
        for (uint i = 0; i < stakeHolders.length; i++) {
            if (_address == stakeHolders[i]) return (true, i);
        }
        return (false, 0);
    }

    function addStakeholder(address _stakeholder) internal {
        (bool _isStakeholder, ) = isStakeholder(_stakeholder);
        if(!_isStakeholder) stakeHolders.push(_stakeholder);
    }

    function removeStakeholder(address _stakeholder) internal {
        (bool _isStakeholder, uint s) = isStakeholder(_stakeholder);
        if (_isStakeholder) {
            stakeHolders[s] = stakeHolders[stakeHolders.length - 1];
            stakeHolders.pop();
        }
    }

    /// Deposit staking tokens
    function deposit(uint amount) 
        external 
        nonReentrant
        whenNotPaused 
        notFrozen(msg.sender) 
    {
        require(amount > 0, "deposit: cannot stake 0");
        require(_token0.balanceOf(msg.sender) >= amount, "deposit: insufficient balance");
        _balances[msg.sender] = _balances[msg.sender].add(amount);
        _totalSupply = _totalSupply.add(amount);  
        addStakeholder(msg.sender);
        distributeRewards();
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
        /// Not overflow
        require(_token0.balanceOf(address(this)) >= amount);
        _totalSupply = _totalSupply.sub(amount);
        _balances[msg.sender] = _balances[msg.sender].sub(amount);
        /// Keep track user withdraws
        withdrawalOf[msg.sender] = withdrawalOf[msg.sender].add(amount);  
        removeStakeholder(msg.sender);   
        distributeRewards();
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
        require(block.timestamp > _end, "withdraw: staking not ended");        
        /// Not overflow
        require(_token1.balanceOf(address(this)) >= amount);
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
        return rewards[_stakeholder];
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