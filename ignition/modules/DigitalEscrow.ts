import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DigitalEscrowModule = buildModule("DigitalEscrowModule", (m) => {
  // Get deployer account
  const deployer = m.getAccount(0);

  // Deploy DigitalEscrow contract
  const digitalEscrow = m.contract("DigitalEscrow", [deployer], {
    from: deployer
  });

  return { digitalEscrow };
});

export default DigitalEscrowModule;