/**
 * Developed by The Flowchain Foundation
 */
pragma solidity 0.5.17;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);

    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address recipient, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address spender, uint amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint amount) external returns (bool);
}


library SafeMath {
    function add(uint a, uint b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    function sub(uint a, uint b) internal pure returns (uint) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;

        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }

        uint c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    function div(uint a, uint b) internal pure returns (uint) {
        return div(a, b, "SafeMath: division by zero");
    }

    function div(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        /// Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint c = a / b;

        return c;
    }
}


library Address {
    function isContract(address account) internal view returns (bool) {
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        /// solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != 0x0 && codehash != accountHash);
    }
}


library SafeERC20 {
    using SafeMath for uint;
    using Address for address;

    function safeTransfer(IERC20 token, address to, uint value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint value) internal {
        callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function safeApprove(IERC20 token, address spender, uint value) internal {
        require((value == 0) || (token.allowance(address(this), spender) == 0),
            "SafeERC20: approve from non-zero to non-zero allowance"
        );
        callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
    }

    function callOptionalReturn(IERC20 token, bytes memory data) private {
        require(address(token).isContract(), "SafeERC20: call to non-contract");

        /// solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "SafeERC20: low-level call failed");

        if (returndata.length > 0) { // Return data is optional
            /// solhint-disable-next-line max-line-length
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }
}


contract Ownable {
    address public owner;
    address public newOwner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() public {
        owner = msg.sender;
        newOwner = address(0);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier onlyNewOwner() {
        require(msg.sender != address(0));
        require(msg.sender == newOwner);
        _;
    }
    
    function isOwner(address account) public view returns (bool) {
        if( account == owner ){
            return true;
        }
        else {
            return false;
        }
    }

    function transferOwnership(address _newOwner) public onlyOwner {
        require(_newOwner != address(0));
        newOwner = _newOwner;
    }

    function acceptOwnership() public onlyNewOwner {
        emit OwnershipTransferred(owner, newOwner);        
        owner = newOwner;
        newOwner = address(0);
    }
}


contract Pausable is Ownable {
    event Paused(address account);
    event Unpaused(address account);

    bool private _paused;

    constructor () public {
        _paused = false;
    }    

    modifier whenNotPaused() {
        require(!_paused);
        _;
    }

    modifier whenPaused() {
        require(_paused);
        _;
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    function pause() public onlyOwner whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }
}


contract StakingDextoken is Pausable {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint;

    event Freeze(address indexed account);
    event Unfreeze(address indexed account);
    event TokenDeposit(address account, uint amount);

    uint private _start;
    uint private _end;
    uint private _duration;

    IERC20 private token0;

    /// Total rewards
    uint private _rewards;

    /// Total amount of user staking tokens
    uint private _totalStakes;

    mapping(address => bool) public frozenAccount;

    /// Keep track of stakeholders
    mapping(address => bool) internal stakeholders;

    /// The stakes for each stakeholder
    mapping(address => uint) internal stakeAmountOf;          

    /// The total stake shares of all stakeholders
    mapping(address => uint) internal totalShares;  

    /// The remaing withdrawals of each stakeholders
    mapping(address => uint) internal withdrawalOf;  

    /// The final withdrawable funds of each stakeholders
    mapping(address => uint) internal fundsOf;

    /// The timestamp of user entering the stake
    mapping(address => uint) internal enter; 

    bool private _paused;

    constructor (address tokenAddress, uint start, uint end) public {
        token0 = IERC20(tokenAddress); 

        _start = start;   
        _end = end;  
        _duration = end.sub(start);  

        _paused = true;
        _rewards = 0;
    }

    modifier whenNotPaused() {
        require(!_paused);
        _;
    }

    modifier whenPaused() {
        require(_paused);
        _;
    }

    modifier onlyIfActive {
        require(_paused == false);
        _;
    }

    modifier notFrozen(address _account) {
        require(!frozenAccount[_account]);
        _;
    }

    /// The staking function
    function deposit(uint amount) 
        external 
        onlyIfActive 
        notFrozen(msg.sender) 
        returns (bool success) 
    {
        require(block.timestamp < _start, "deposit: deposit closed");
        require(amount > 0, "deposit: amount invalid");
        require(token0.balanceOf(msg.sender) >= amount, "deposit: insufficient balance");

        /// Enter staking
        enter[msg.sender] = block.timestamp;

        if (stakeAmountOf[msg.sender] == 0) _addStakeholder(msg.sender);
        stakeAmountOf[msg.sender] = stakeAmountOf[msg.sender].add(amount);

        /// Total amount of user staking tokens
        _totalStakes = _totalStakes.add(amount);

        /// Transfer
        token0.safeTransferFrom(msg.sender, address(this), amount);

        emit TokenDeposit(msg.sender, amount);
        return true;
    }

    function withdraw(uint amount) 
        external 
        onlyIfActive 
        notFrozen(msg.sender) 
        returns (bool success) 
    {
        require(block.timestamp > _end, "withdraw: withdraw not open");
        require(amount > 0, "withdraw: amount invalid");

        /// Get all user funds
        calculateFundsOf(msg.sender);

        require(fundsOf[msg.sender] > 0, "withdraw: funds insufficient");
        require(withdrawalOf[msg.sender].add(amount) <= fundsOf[msg.sender], "withdraw: funds insufficient");

        /// Not overflow
        require(token0.balanceOf(address(this)) >= amount);

        /// Withdraw
        withdrawalOf[msg.sender] = withdrawalOf[msg.sender].add(amount);

        /// Unlocked and Transfer
        token0.safeTransfer(msg.sender, amount);

        return true;
    }

    function setRewards(uint amount) external onlyOwner returns (bool) {
        require(amount > 0, "setRewards: invalid amount");
        require(token0.balanceOf(address(this)) >= amount, "setRewards: insufficient balance");

        _rewards = amount;
        return true;
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

    function getDuration() external view returns(uint) {
        return _duration;
    }

    function getStartTimestamp() external view returns(uint) {
        return _start;
    }

    function getEndTimestamp() external view returns(uint) {
        return _end;
    }

    /// Get remaining rewards of the time period
    function remainingRewards() external view returns(uint) {
        require(block.timestamp >= _start, "staking not open");
        require(block.timestamp <= _end, "staking ended");

        (uint _total) = totalOriginalRewards();
        (uint _currentDuration) = _end.sub(block.timestamp);
        return _total.mul(_currentDuration).div(_duration);
    } 
    
    /// A method to calculate the rewards locked of the stakehodler.
    function getRewardLocked(address _stakeholder) external view returns(uint) {
        require(block.timestamp >= _start, "getRewardLocked: staking not open");
        require(block.timestamp <= _end, "getRewardLocked: staking ended");

        (uint _currentDuration) = block.timestamp.sub(_start);
        (uint _reward) = calculateRewardOf(_stakeholder);
        return _reward.mul(_currentDuration).div(_duration);
    } 

    function pause() public onlyOwner whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function isStakeholder(address _address) public view returns(bool) {
        return stakeholders[_address];
    }

    /// Retrieve the stake for a stakeholder
    function stakeOf(address _stakeholder) public view returns(uint) {
        return stakeAmountOf[_stakeholder];
    }

    /// The stakes of all stakeholders
    function getTotalStakes() public view returns(uint) {
        return _totalStakes;
    }

    function getFundsOf(address _address) public view returns (uint) {
        require(fundsOf[_address] > 0, "withdraw: funds insufficient");
        return fundsOf[_address];
    }

    /// Get totol original rewards
    function totalOriginalRewards() public view returns(uint) {
        return _rewards;
    } 

    /// A simple method that calculates the final rewards for each stakeholder by shares.
    function calculateRewardOf(address _stakeholder) public view returns(uint) {
        (uint _userStakeAmount) = stakeOf(_stakeholder);
        require(_totalStakes > 0, "calculateRewardOf: invalid total stakes");

        return _rewards.mul(_userStakeAmount).div(_totalStakes);
    }

    function _addStakeholder(address _stakeholder) internal {
        stakeholders[_stakeholder] = true;
    }

    function _removeStakeholder(address _stakeholder) internal {
        stakeholders[_stakeholder] = false;
    }

    /// A method to calculate user funds.
    function calculateFundsOf(address _stakeholder) internal returns (uint) {
        require(stakeholders[_stakeholder] == true, "calculateFundsOf: not stakholder");

        /// Get deposit amount
        (uint _userStakeAmount) = stakeOf(_stakeholder);

        /// Get rewards
        (uint reward) = calculateRewardOf(_stakeholder);

        /// Totoal funds
        fundsOf[_stakeholder] = _userStakeAmount.add (reward);

        return fundsOf[_stakeholder];
    }   
}   