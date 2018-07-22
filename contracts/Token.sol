pragma solidity ^0.4.23;

contract Token {
    mapping(address => uint) private m_bank;
    uint private m_total;
    address private m_owner;
    uint private m_conversion_rate;

    function wei_to_token(uint value) internal view returns(uint) {
        return value / m_conversion_rate;
    }

    modifier value_divisible() {
        uint value = msg.value;
        require(
            wei_to_token(value) * m_conversion_rate == value,
            "Contribution must be divisible by conversion rate"
        );
        _;
    } 

    modifier owner_only() {
        require(msg.sender == m_owner, "Must be owner");
        _;
    }

    modifier have_enough(uint amount) {
        require(m_bank[msg.sender] >= amount, "You don't have enough tokens to spend");
        _;
    }

    constructor(uint conversion_rate) public payable value_divisible() {
        m_conversion_rate = conversion_rate;
        m_owner = msg.sender;
        m_total = wei_to_token(msg.value);
        m_bank[m_owner] = m_total;
    }
    
    function payout() public owner_only {
        m_owner.transfer(address(this).balance);
    }

    function transfer(address to, uint amount) public have_enough(amount) {
        m_bank[msg.sender] -= amount;
        m_bank[to] += amount;
    }

    function buy_tokens() public payable value_divisible {
        uint amount = wei_to_token(msg.value);
        m_bank[msg.sender] += amount;
        m_total += amount;
    }

    function total_balance() public view returns(uint) {
        return m_total;
    }

    function conversion_rate() public view returns(uint) {
        return m_conversion_rate;
    }

}
