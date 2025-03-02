// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Faucet {
    address public owner;
    // No se establece un monto fijo; el reclamo será dinámico (el monto se indica en cada operación)
    mapping(address => bool) public whitelist;

    event FundsDeposited(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event Whitelisted(address indexed wallet);
    event RemovedFromWhitelist(address indexed wallet);
    event FundsClaimed(address indexed wallet, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    function withdrawFunds(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(owner).transfer(amount);
        emit FundsWithdrawn(owner, amount);
    }
    
    function addToWhitelist(address wallet) external onlyOwner {
        whitelist[wallet] = true;
        emit Whitelisted(wallet);
    }
    
    function removeFromWhitelist(address wallet) external onlyOwner {
        whitelist[wallet] = false;
        emit RemovedFromWhitelist(wallet);
    }
    
    function isWhitelited(address wallet) public view returns (bool) {
        return whitelist[wallet];
    }
    
    // Función para que la wallet misma reclame fondos, indicando el monto deseado
    function claimFunds(uint256 amountToClaim) external {
        require(whitelist[msg.sender], "Not whitelisted");
        require(amountToClaim > 0, "Amount must be > 0");
        if(address(this).balance < amountToClaim) {
            amountToClaim = address(this).balance;
        }
        payable(msg.sender).transfer(amountToClaim);
        emit FundsClaimed(msg.sender, amountToClaim);
    }
    
    // Función para que el owner (DEV_WALLET) actúe como relayer y reclame fondos en nombre de otra wallet
    function claimFundsFor(uint256 amountToClaim, address recipient) external onlyOwner {
        require(whitelist[recipient], "Not whitelisted");
        require(amountToClaim > 0, "Amount must be > 0");
        if(address(this).balance < amountToClaim) {
            amountToClaim = address(this).balance;
        }
        payable(recipient).transfer(amountToClaim);
        emit FundsClaimed(recipient, amountToClaim);
    }
}
