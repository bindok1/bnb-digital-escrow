// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDigitalEscrow {
    enum Status {
        Created,     
        Funded,     
        Delivered,   
        Completed,
        Disputed
    }

    event UpgradeExecuted(address newImplementation);

    struct Transaction {
        address buyer;
        address seller;
        uint256 amount;       
        string productKey;     
        string proofImage;    
        Status status;
        uint256 createdAt;
        uint256 disputeInitiatedAt;
    }

    event TransactionCreated(uint256 indexed transactionId, address buyer, address seller);
    event ProductDelivered(uint256 indexed transactionId, string proofImage);
    event TransactionCompleted(uint256 indexed transactionId);
    event DisputeInitiated(uint256 indexed transactionId);
    event DisputeResolved(uint256 indexed transactionId, bool sellerWins);
    event EmergencyWithdraw(uint256 amount);
    event TransactionTimeout(uint256 indexed transactionId);
    event WithdrawSuccessful(address indexed seller, uint256 amount);

    function createTransaction(address _seller, string memory _productKey) external payable;
    function deliverProduct(uint256 _transactionId, string memory _proofImage) external;
    function confirmReceive(uint256 _transactionId) external;
    function withdraw() external;
    function initiateDispute(uint256 _transactionId) external;
    function resolveDispute(uint256 _transactionId, bool _sellerWins) external;
    function autoResolveDispute(uint256 _transactionId) external;
}