// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./IDigitalEscrow.sol";
import "./EscrowLib.sol";

abstract contract BaseEscrow is 
    IDigitalEscrow,
    Initializable, 
    UUPSUpgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable 
{

    using EscrowLib for string;
    using EscrowLib for uint256;
    using EscrowLib for address;
    
    // Constants
    uint256 public constant MAX_TRANSACTION_AMOUNT = 10 ether;
    uint256 public constant MAX_TRANSACTION_DURATION = 10 days;
    uint256 public constant DISPUTE_TIMEOUT = 7 days;
    uint256 public constant MAX_STRING_LENGTH = 1000;

    // State variables
    mapping(uint256 => Transaction) public transactions;
    uint256 public transactionCount;
    mapping(address => uint256) public balances;
    address public defaultMediator;

    error TransactionExpired(uint256 timestamp);
    error UnauthorizedAccess(address caller);
    error TransactionNotFound(uint256 transactionId);
    error InvalidStatus(Status current, Status required);
    error TransferFailed();
    error DisputeAlreadyInitiated();

    modifier transactionExists(uint256 _transactionId) {
        if (_transactionId == 0 || _transactionId > transactionCount) 
            revert TransactionNotFound(_transactionId);
        _;
    }
}