const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");
const colors = require("colors");
const { RPC_URL, CHAIN_ID, TX_EXPLORER, ADDRESS_EXPLORER } = require("./chain");

// Development wallet variables – update with your actual values
const DEV_ADDRESS = "YOUR_ADDRESS";
const DEV_PRIVATE_KEY = "YOUR_PRIVATE_KEY";

// Read faucet.sol source code
const sourcePath = path.join(__dirname, "faucet.sol");
const source = fs.readFileSync(sourcePath, "utf8");

// Prepare solc input
const input = {
  language: "Solidity",
  sources: {
    "faucet.sol": {
      content: source
    }
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"]
      }
    }
  }
};

function compileWith(solcCompiler) {
  const output = JSON.parse(solcCompiler.compile(JSON.stringify(input)));
  if (output.errors) {
    const errors = output.errors.filter((error) => error.severity === "error");
    if (errors.length > 0) {
      errors.forEach((error) => console.error(error.formattedMessage));
      throw new Error("Compilation failed");
    }
  }
  return output;
}

async function compileContract() {
  return new Promise((resolve, reject) => {
    // Use Solidity version 0.8.0
    solc.loadRemoteVersion("v0.8.0+commit.c7dfd78e", (err, solcSpecific) => {
      if (err) {
        console.error("Error loading remote solc version, falling back to local solc.");
        try {
          const output = compileWith(solc);
          return resolve(output);
        } catch (compErr) {
          return reject(compErr);
        }
      } else {
        try {
          const output = compileWith(solcSpecific);
          return resolve(output);
        } catch (compErr) {
          return reject(compErr);
        }
      }
    });
  });
}

async function main() {
  const output = await compileContract();
  // Assuming the contract is named "Faucet"
  const contractName = "Faucet";
  const contractOutput = output.contracts["faucet.sol"][contractName];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const wallet = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
  const nonce = await provider.getTransactionCount(DEV_ADDRESS);
  
  // Obtain feeData and compute newFee as baseFee + 5%
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  const extra = baseFee.mul(5).div(100);
  const newFee = baseFee.add(extra);
  
  // Random gasLimit between 1,800,000 and 2,500,000
  const gasLimit = Math.floor(Math.random() * (900000 - 1500000 + 1)) + 1500000;
  
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log(colors.green("⚙️  Deploying Faucet Contract..."));
  const contract = await factory.deploy({
    nonce: nonce,
    gasLimit: gasLimit,
    maxFeePerGas: newFee,
    maxPriorityFeePerGas: newFee,
    chainId: CHAIN_ID
  });
  console.log(`🔗 Tx Hash: [${TX_EXPLORER}${contract.deployTransaction.hash}]`.green);
  await contract.deployed();
  console.log(colors.green(`🎉 Faucet Contract Deployed at: [${ADDRESS_EXPLORER}${contract.address}]`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
