import hre from "hardhat";

async function main() {
    console.log("Deploying DigitalEscrow...");
  
    const deployer = (await hre.viem.getWalletClients())[0].account.address;
    console.log("Deploying with address:", deployer);
  
 
    const DigitalEscrow = await hre.ethers.getContractFactory("DigitalEscrow");
    const digitalEscrow = await hre.upgrades.deployProxy(DigitalEscrow, [deployer], {
        initializer: 'initialize',
    });
    
    await digitalEscrow.waitForDeployment();
    console.log("DigitalEscrow deployed to:", await digitalEscrow.getAddress());
    console.log("Contract initialized with owner:", deployer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });