// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library EscrowLib {
    error StringTooLong(uint256 length);
    error InvalidAmount(uint256 amount);
    error InvalidAddress(address addr);

    function validateString(string memory str, uint256 maxLength) internal pure {
        if(bytes(str).length > maxLength) revert StringTooLong(bytes(str).length);
    }

    function validateAmount(uint256 amount, uint256 maxAmount) internal pure {
        if(amount == 0 || amount > maxAmount) revert InvalidAmount(amount);
    }

    function validateAddress(address addr) internal pure {
        if(addr == address(0)) revert InvalidAddress(addr);
    }
}