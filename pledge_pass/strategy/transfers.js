const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");
const ethers = require("ethers");
const colors = require("colors");

// Import network configuration and contract ABI from faucetABI.json (deployed contract)
const { RPC_URL, CHAIN_ID, TX_EXPLORER, ADDRESS_EXPLORER } = require("./chain");
const faucetData = require("./faucetABI.json");
const FAUCET_ADDRESS = faucetData.address;
const FAUCET_ABI = faucetData.abi;

// Development wallet variables – update with your actual values
const DEV_ADDRESS = "YOUR_ADDRESS";
const DEV_PRIVATE_KEY = "YOUR_PRIVATE_KEY";

// Load wallets from utils/wallets.json
const loadWallets = () => {
  const walletsPath = path.join("../../utils/wallets.json");
  if (!fs.existsSync(walletsPath)) {
    fs.writeFileSync(walletsPath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(walletsPath, "utf-8"));
};

// TRANSFER FUNCTIONS

async function sendFundsToFaucet() {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    console.log("No wallets found");
    return;
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const devWallet = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
  const balance = await devWallet.getBalance();
  console.log(`Dev Wallet - [${devWallet.address}] Currently Has ${ethers.utils.formatEther(balance)} ETH`);
  
  // Transfer gas settings: fixed gasLimit = 100000, fee = baseFee + 15%
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  const extra = baseFee.mul(15).div(100);
  const newFee = baseFee.add(extra);
  
  const { amount } = await inquirer.prompt([
    {
      type: "input",
      name: "amount",
      message: "How much do you wish to send to the Faucet? (in ETH)"
    }
  ]);
  const tx = await devWallet.sendTransaction({
    to: FAUCET_ADDRESS,
    value: ethers.utils.parseEther(amount),
    gasLimit: 100000,
    maxFeePerGas: newFee,
    maxPriorityFeePerGas: newFee
  });
  console.log(`Tx Hash Sent! - [${TX_EXPLORER}${tx.hash}]`);
  const receipt = await tx.wait();
  console.log(`Tx Confirmed in Block - [${receipt.blockNumber}]\n`);
}

async function withdrawFundsFromFaucet() {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    console.log("No wallets found");
    return;
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const devWallet = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
  const faucetContract = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, devWallet);
  const contractBalance = await provider.getBalance(FAUCET_ADDRESS);
  console.log(`Faucet Contract - [${FAUCET_ADDRESS}] Currently Has ${ethers.utils.formatEther(contractBalance)} ETH`);
  
  // Transfer gas settings: fixed gasLimit = 100000, fee = baseFee + 15%
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  const extra = baseFee.mul(15).div(100);
  const newFee = baseFee.add(extra);
  
  const { amount } = await inquirer.prompt([
    {
      type: "input",
      name: "amount",
      message: "How much do you wish to withdraw from the Contract? (in ETH)"
    }
  ]);
  const tx = await faucetContract.withdrawFunds(ethers.utils.parseEther(amount), {
    gasLimit: 100000,
    maxFeePerGas: newFee,
    maxPriorityFeePerGas: newFee
  });
  console.log(`Tx Hash Sent! - [${TX_EXPLORER}${tx.hash}]`);
  const receipt = await tx.wait();
  console.log(`Tx Confirmed in Block - [${receipt.blockNumber}]\n`);
}

async function claimFundsFromFaucet() {
  const wallets = loadWallets();
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "On which wallets would you like to claim faucet?",
      choices: ["All of them", "Specific IDs"]
    }
  ]);
  let selectedWallets;
  if (choice === "All of them") {
    selectedWallets = wallets;
  } else {
    const { ids } = await inquirer.prompt([
      {
        type: "input",
        name: "ids",
        message: "Enter wallet IDs separated by spaces:"
      }
    ]);
    const idArray = ids.split(" ").map(id => parseInt(id.trim()));
    selectedWallets = wallets.filter(w => idArray.includes(w.id));
  }
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  
  // Claim gas settings: random gasLimit between 120000 and 200000, fee = baseFee + 15%
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  const extra = baseFee.mul(15).div(100);
  const newFee = baseFee.add(extra);
  
  // Mostrar el balance actual del contrato Faucet
  const contractBalance = await provider.getBalance(FAUCET_ADDRESS);
  console.log(`Faucet Balance: ${ethers.utils.formatEther(contractBalance)} ETH`);
  
  // Solicitar la cantidad a reclamar (en ETH) para todas las wallets
  const { claimAmount } = await inquirer.prompt([
    {
      type: "input",
      name: "claimAmount",
      message: "Enter the amount (in ETH) to claim for each wallet:"
    }
  ]);
  
  // Usar DEV_WALLET como relayer para llamar a claimFundsFor para cada wallet
  const devWallet = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
  const faucetContractWithDev = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, devWallet);
  
  for (const walletData of selectedWallets) {
    console.log(`Claiming funds for Wallet - [${walletData.address}] using DEV_WALLET as relayer`);
    const claimTx = await faucetContractWithDev.claimFundsFor(
      ethers.utils.parseEther(claimAmount),
      walletData.address,
      {
        gasLimit: Math.floor(Math.random() * (200000 - 120000 + 1)) + 120000,
        maxFeePerGas: newFee,
        maxPriorityFeePerGas: newFee
      }
    );
    console.log(`Tx Hash Sent! - [${TX_EXPLORER}${claimTx.hash}]`);
    const claimReceipt = await claimTx.wait();
    console.log(`Tx Confirmed in Block - [${claimReceipt.blockNumber}]\n`);
  }
}

async function manageWhitelist() {
  const wallets = loadWallets();
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const devWallet = new ethers.Wallet(DEV_PRIVATE_KEY, provider);
  const faucetContract = new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, devWallet);
  
  // Get fee data for whitelist operations (random gasLimit between 120000 and 200000)
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  const extra = baseFee.mul(15).div(100);
  const newFee = baseFee.add(extra);
  
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: ["Add Wallets To Whitelist", "Remove Wallets From Whitelist"]
    }
  ]);
  for (const walletData of wallets) {
    const walletAddress = walletData.address;
    // Llamar a la función isWhitelited definida en el contrato
    const isWhitelisted = await faucetContract.isWhitelited(walletAddress);
    if (action === "Add Wallets To Whitelist") {
      if (isWhitelisted) {
        console.log(`Wallet - [${walletAddress}] is already whitelisted.`);
      } else {
        const tx = await faucetContract.addToWhitelist(walletAddress, {
          gasLimit: Math.floor(Math.random() * (200000 - 120000 + 1)) + 120000,
          maxFeePerGas: newFee,
          maxPriorityFeePerGas: newFee
        });
        console.log(`Adding Wallet - [${walletAddress}] to whitelist...`);
        console.log(`Tx Hash Sent! - [${TX_EXPLORER}${tx.hash}]`);
        const receipt = await tx.wait();
        console.log(`Tx Confirmed in Block - [${receipt.blockNumber}]\n`);
      }
    } else {
      if (!isWhitelisted) {
        console.log(`Wallet - [${walletAddress}] is not in the whitelist.`);
      } else {
        const tx = await faucetContract.removeFromWhitelist(walletAddress, {
          gasLimit: Math.floor(Math.random() * (200000 - 120000 + 1)) + 120000,
          maxFeePerGas: newFee,
          maxPriorityFeePerGas: newFee
        });
        console.log(`Removing Wallet - [${walletAddress}] from whitelist...`);
        console.log(`Tx Hash Sent! - [${TX_EXPLORER}${tx.hash}]`);
        const receipt = await tx.wait();
        console.log(`Tx Confirmed in Block - [${receipt.blockNumber}]\n`);
      }
    }
  }
}

const mainMenu = async () => {
  const { option } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select an option:",
      choices: [
        "Send Funds To Faucet",
        "Withdraw Funds From Faucet",
        "Claim Funds From Faucet",
        "Manage Whitelist",
        "Exit"
      ]
    }
  ]);
  if (option === "Send Funds To Faucet") {
    await sendFundsToFaucet();
  } else if (option === "Withdraw Funds From Faucet") {
    await withdrawFundsFromFaucet();
  } else if (option === "Claim Funds From Faucet") {
    await claimFundsFromFaucet();
  } else if (option === "Manage Whitelist") {
    await manageWhitelist();
  } else {
    process.exit(0);
  }
  const { again } = await inquirer.prompt([
    {
      type: "confirm",
      name: "again",
      message: "Do you want to perform another task?",
      default: true
    }
  ]);
  if (again) {
    mainMenu();
  } else {
    process.exit(0);
  }
};

mainMenu();
