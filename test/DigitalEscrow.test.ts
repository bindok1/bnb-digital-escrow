import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { parseEther } from "viem";
import { stringToHex } from "../utils/converter";

describe("DigitalEscrow", function () {
  async function deployDigitalEscrowFixture() {
    const [owner, seller, buyer, mediator] = await hre.viem.getWalletClients();
    
    // Deploy implementation
    const implementation = await hre.viem.deployContract("contracts/escrow/DigitalEscrow.sol:DigitalEscrow", []);
    
    // Deploy proxy 
    const proxy = await hre.viem.deployContract("contracts/proxy/UUPSProxy.sol:UUPSProxy", [
      implementation.address, 
      owner.account.address  
    ]);
    
    // Get contract instance at proxy address
    const digitalEscrow = await hre.viem.getContractAt(
      "DigitalEscrow",
      proxy.address
    );
    
    return { digitalEscrow, owner, seller, buyer, mediator };
  }

  describe("Deployment & Initialization", function () {
    it("Should set the right owner", async function () {
      const { digitalEscrow, owner } = await loadFixture(deployDigitalEscrowFixture);
      
      const contractOwner = await digitalEscrow.read.owner({});
      expect(contractOwner.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });
  });

  describe("Transaction Creation", function () {
    it("Should create transaction successfully", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      const productKeyHex = stringToHex("product123");
      const value = parseEther("1");

      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, productKeyHex],
        value
      });


      const txn = await digitalEscrow.read.transactions([1n]);
      expect(txn[0].toLowerCase()).to.equal(buyer.account.address.toLowerCase()); 
      expect(txn[1].toLowerCase()).to.equal(seller.account.address.toLowerCase()); 
      expect(txn[2]).to.equal(value); 
    });
  });


  describe("Transaction Creation Validations", function () {
    it("Should reject zero amount", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      await expect(
        buyer.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "createTransaction",
          args: [seller.account.address, stringToHex("product123")],
          value: 0n
        })
      ).to.be.rejectedWith("InvalidAmount");
    });

    it("Should reject amount exceeding max", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      await expect(
        buyer.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "createTransaction",
          args: [seller.account.address, stringToHex("product123")],
          value: parseEther("11") // MAX is 10 ether
        })
      ).to.be.rejectedWith("InvalidAmount");
    });

    it("Should reject zero address seller", async function () {
      const { digitalEscrow, buyer } = await loadFixture(deployDigitalEscrowFixture);
      
      await expect(
        buyer.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "createTransaction",
          args: ["0x0000000000000000000000000000000000000000", stringToHex("product123")],
          value: parseEther("1")
        })
      ).to.be.rejectedWith("InvalidAddress");
    });
  });

  describe("Transaction Flow", function () {
    it("Should handle full transaction cycle", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      // Create transaction
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });

      // Deliver product
      await seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "deliverProduct",
        args: [1n, "proof123"]
      });

      // Confirm receipt
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "confirmReceive",
        args: [1n]
      });

      const status = await digitalEscrow.read.getTransactionStatus([1n]);
      expect(Number(status)).to.equal(3); 
    });
  });

  describe("Delivery Validations", function () {
    it("Should reject delivery from non-seller", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });
  
      await expect(
        buyer.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "deliverProduct",
          args: [1n, "proof123"]
        })
      ).to.be.rejectedWith("UnauthorizedAccess");
    });
  });

  describe("Dispute Flow Additional Tests", function () {
    it("Should handle dispute resolution for buyer", async function () {
      const { digitalEscrow, buyer, seller, owner } = await loadFixture(deployDigitalEscrowFixture);
      
      // Setup transaction
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });
  
      await seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "deliverProduct",
        args: [1n, "proof123"]
      });
  
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "initiateDispute",
        args: [1n]
      });
  
      // Resolve in favor of buyer
      await owner.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "resolveDispute",
        args: [1n, false]
      });
  
      const status = await digitalEscrow.read.getTransactionStatus([1n]);
      expect(Number(status)).to.equal(3); // Completed
    });
  
    it("Should reject dispute resolution from non-owner", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      // Setup and initiate dispute
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });
  
      await seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "deliverProduct",
        args: [1n, "proof123"]
      });
  
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "initiateDispute",
        args: [1n]
      });
  
      // Try to resolve with seller (should fail)
      await expect(
        seller.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "resolveDispute",
          args: [1n, true]
        })
      ).to.be.rejectedWith("UnauthorizedAccess");
    });
  });

  describe("Emergency Functions Additional Tests", function () {
    it("Should reject emergency withdraw when not paused", async function () {
      const { digitalEscrow, owner } = await loadFixture(deployDigitalEscrowFixture);
      
      await expect(
        owner.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "emergencyWithdraw",
          args: []
        })
      ).to.be.rejected;
    });
  });


  describe("Dispute Flow", function () {
    it("Should handle dispute resolution for seller", async function () {
      const { digitalEscrow, buyer, seller, owner } = await loadFixture(deployDigitalEscrowFixture);
      
      // Setup: Create & deliver
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });
  
      await seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "deliverProduct",
        args: [1n, "proof123"]
      });
  
      // Initiate dispute
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "initiateDispute",
        args: [1n]
      });
  
      // Resolve in favor of seller using owner as default mediator
      await owner.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "resolveDispute",
        args: [1n, true]
      });
  
      const status = await digitalEscrow.read.getTransactionStatus([1n]);
      expect(Number(status)).to.equal(3); // Completed
    });
});

  describe("Emergency Functions", function () {
    it("Should allow owner to pause and unpause", async function () {
      const { digitalEscrow, owner } = await loadFixture(deployDigitalEscrowFixture);
      
      await owner.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "togglePause",
        args: []
      });
  
      const isPaused = await digitalEscrow.read.paused();
      expect(isPaused).to.be.true;
    });
  });

  describe("Gas Usage", function () {
    it("Should have reasonable gas usage for basic operations", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
      
      // Create transaction
      const createTx = await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });

      const createReceipt = await (await hre.viem.getPublicClient()).getTransactionReceipt({ hash: createTx })
      expect(Number(createReceipt.gasUsed)).to.be.lessThan(200000);

      // Deliver product
      const deliverTx = await seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "deliverProduct",
        args: [1n, "proof123"]
      });

      const  deliverReceipt =  await (await hre.viem.getPublicClient()).getTransactionReceipt({ hash: deliverTx })
      expect(Number(deliverReceipt.gasUsed)).to.be.lessThan(1000000);
    });
});

describe("Withdraw Function", function () {
  it("Should allow withdrawal after successful transaction", async function () {
    const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
    
    // Setup complete transaction
    await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "createTransaction",
      args: [seller.account.address, stringToHex("product123")],
      value: parseEther("1")
    });

    await seller.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "deliverProduct",
      args: [1n, "proof123"]
    });

    await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "confirmReceive",
      args: [1n]
    });

    // Try withdraw
    await seller.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "withdraw",
      args: []
    });

    const balance = await digitalEscrow.read.balances([seller.account.address]);
    expect(balance).to.equal(0n);
  });

  it("Should reject withdrawal with zero balance", async function () {
    const { digitalEscrow, seller } = await loadFixture(deployDigitalEscrowFixture);
    
    await expect(
      seller.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "withdraw",
        args: []
      })
    ).to.be.rejectedWith("InvalidAmount");
  });
});

describe("Auto Resolve Dispute", function () {
  it("Should auto resolve dispute after timeout", async function () {
    const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
    
    // Setup transaction and dispute
    await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "createTransaction",
      args: [seller.account.address, stringToHex("product123")],
      value: parseEther("1")
    });

    await seller.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "deliverProduct",
      args: [1n, "proof123"]
    });

    await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "initiateDispute",
      args: [1n]
    });

    // Increase time beyond DISPUTE_TIMEOUT
    await hre.network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
    await hre.network.provider.send("evm_mine");

    await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "autoResolveDispute",
      args: [1n]
    });

    // Verify buyer received funds
    const buyerBalance = await digitalEscrow.read.balances([buyer.account.address]);
    expect(buyerBalance).to.equal(parseEther("1"));
  });
});

describe("Event Emissions", function () {
  it("Should emit correct events during transaction lifecycle", async function () {
    const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
    
    const createTx = await buyer.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "createTransaction",
      args: [seller.account.address, stringToHex("product123")],
      value: parseEther("1")
    });

    const createReceipt = await (await hre.viem.getPublicClient()).getTransactionReceipt({ hash: createTx });
    expect(createReceipt.logs.length).to.be.greaterThan(0);

  
  });
});

describe("Multiple Transactions", function () {
  it("Should handle multiple concurrent transactions", async function () {
    const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
    
    // Create multiple transactions
    for(let i = 1; i <= 3; i++) {
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex(`product${i}`)],
        value: parseEther("1")
      });
    }

    const txCount = await digitalEscrow.read.transactionCount();
    expect(Number(txCount)).to.equal(3);
  });
});

describe("Upgrade", function () {
  it("Should allow owner to upgrade implementation", async function () {
    const { digitalEscrow, owner } = await loadFixture(deployDigitalEscrowFixture);
    
    const newImplementation = await hre.viem.deployContract(
      "contracts/escrow/DigitalEscrow.sol:DigitalEscrow",
      []
    );

    await owner.writeContract({
      address: digitalEscrow.address,
      abi: digitalEscrow.abi,
      functionName: "upgradeToAndCall",
      args: [newImplementation.address, "0x"]
    });
  });
});

  describe("Expired Transactions", function () {
    it("Should reject transaction confirmation after expiration", async function () {
      const { digitalEscrow, buyer, seller } = await loadFixture(deployDigitalEscrowFixture);
  
      // Create transaction
      await buyer.writeContract({
        address: digitalEscrow.address,
        abi: digitalEscrow.abi,
        functionName: "createTransaction",
        args: [seller.account.address, stringToHex("product123")],
        value: parseEther("1")
      });

      
       await hre.network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
       await hre.network.provider.send("evm_mine");

      
      await expect(
        seller.writeContract({
          address: digitalEscrow.address,
          abi: digitalEscrow.abi,
          functionName: "deliverProduct",
          args: [1n, "proof123"]
        })
      ).to.be.rejectedWith("TransactionExpired");
    });
});


});
