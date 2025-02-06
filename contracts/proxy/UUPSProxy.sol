// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract UUPSProxy is ERC1967Proxy {
    constructor(address _implementation, address _owner) 
        ERC1967Proxy(
            _implementation,
            abi.encodeWithSignature("initialize(address)", _owner)
        )
    {}
}