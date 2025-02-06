// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./BaseEscrow.sol";
import "./EscrowLib.sol";

contract DigitalEscrow is BaseEscrow {
    using EscrowLib for string;
    using EscrowLib for uint256;
    using EscrowLib for address;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address platformOwner) public initializer {
        __Ownable_init(platformOwner);
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        defaultMediator = platformOwner;
    }

    function createTransaction(
        address _seller,
        string memory _productKey
    ) public payable override whenNotPaused nonReentrant {
        msg.value.validateAmount(MAX_TRANSACTION_AMOUNT);
        _seller.validateAddress();
        _productKey.validateString(MAX_STRING_LENGTH);

        transactionCount++;
        transactions[transactionCount] = Transaction({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            productKey: _productKey,
            proofImage: "",
            status: Status.Funded,
            createdAt: block.timestamp,
            disputeInitiatedAt: 0
        });

        emit TransactionCreated(transactionCount, msg.sender, _seller);
    }

    function deliverProduct(
        uint256 _transactionId, 
        string memory _proofImage
    ) public override whenNotPaused nonReentrant transactionExists(_transactionId) {
        Transaction storage txn = transactions[_transactionId];
        if(msg.sender != txn.seller) revert UnauthorizedAccess(msg.sender);
        if(txn.status != Status.Funded) revert InvalidStatus(txn.status, Status.Funded);
        
        EscrowLib.validateString(_proofImage, MAX_STRING_LENGTH);
        
        if(block.timestamp > txn.createdAt + MAX_TRANSACTION_DURATION) {
            revert TransactionExpired(block.timestamp);
        }

        txn.proofImage = _proofImage;
        txn.status = Status.Delivered;

        emit ProductDelivered(_transactionId, _proofImage);
    }

    function confirmReceive(
        uint256 _transactionId
    ) public override whenNotPaused nonReentrant transactionExists(_transactionId) {
        Transaction storage txn = transactions[_transactionId];
        if(msg.sender != txn.buyer) revert UnauthorizedAccess(msg.sender);
        if(txn.status != Status.Delivered) revert InvalidStatus(txn.status, Status.Delivered);

        txn.status = Status.Completed;
        balances[txn.seller] += txn.amount;  
        
        emit TransactionCompleted(_transactionId);
    }

    function withdraw() public override nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert EscrowLib.InvalidAmount(amount);

        balances[msg.sender] = 0; 
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit WithdrawSuccessful(msg.sender, amount);
    }

    function initiateDispute(
        uint256 _transactionId
    ) public override whenNotPaused nonReentrant transactionExists(_transactionId) {
        Transaction storage txn = transactions[_transactionId];
        if(msg.sender != txn.buyer) revert UnauthorizedAccess(msg.sender);
        if(txn.status != Status.Delivered) revert InvalidStatus(txn.status, Status.Delivered);
        
        // Check if within dispute window
        if(block.timestamp > txn.createdAt + MAX_TRANSACTION_DURATION) {
            revert TransactionExpired(block.timestamp);
        }

        // Prevent multiple disputes
        if(txn.disputeInitiatedAt != 0) revert DisputeAlreadyInitiated();

        txn.status = Status.Disputed;
        txn.disputeInitiatedAt = block.timestamp;
        
        emit DisputeInitiated(_transactionId);
    }

    function resolveDispute(
        uint256 _transactionId, 
        bool _sellerWins
    ) public override whenNotPaused nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if(msg.sender != owner()) revert UnauthorizedAccess(msg.sender);
        if(txn.status != Status.Disputed) revert InvalidStatus(txn.status, Status.Disputed);
        
        if(block.timestamp > txn.disputeInitiatedAt + DISPUTE_TIMEOUT) {
            revert TransactionExpired(block.timestamp);
        }

        if (_sellerWins) {
            balances[txn.seller] += txn.amount;
        } else {
            balances[txn.buyer] += txn.amount;
        }

        txn.status = Status.Completed;
        emit DisputeResolved(_transactionId, _sellerWins);
    }

    function autoResolveDispute(
        uint256 _transactionId
    ) public override whenNotPaused nonReentrant {
        Transaction storage txn = transactions[_transactionId];
        if(txn.status != Status.Disputed) revert InvalidStatus(txn.status, Status.Disputed);
        if(block.timestamp <= txn.disputeInitiatedAt + DISPUTE_TIMEOUT) {
            revert TransactionExpired(block.timestamp);
        }

        balances[txn.buyer] += txn.amount;
        txn.status = Status.Completed;
        
        emit TransactionTimeout(_transactionId);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {
        emit UpgradeExecuted(newImplementation);
    }

    // Additional helper functions
    function setDefaultMediator(address _newMediator) external onlyOwner {
        _newMediator.validateAddress();
        defaultMediator = _newMediator;
    }

    function togglePause() external onlyOwner {
        if(paused()) {
            _unpause();
        } else {
            _pause();
        }
    }

    function emergencyWithdraw() external onlyOwner whenPaused nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert EscrowLib.InvalidAmount(balance);
        uint256 amountToWithdraw = balance;
        (bool success, ) = payable(owner()).call{value: amountToWithdraw}("");
        
        if (!success) revert TransferFailed();
        emit EmergencyWithdraw(balance);
    }

    function getTransactionStatus(
        uint256 _transactionId
    ) public view returns (Status) {
        return transactions[_transactionId].status;
    }
}