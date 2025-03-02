const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
const colors = require('colors');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Import API functions from scripts/apis.js
const {
  verifyPremiumPass,
  verifyBasicPass,
  verifyProofSubmission,
  sendProof,
  checkNodeTask
} = require('./scripts/apis');

// Helper: Retry an API call when error 502 or "socket hang up" occurs, up to a given number of retries
const retryApiCall = async (apiCall, retries = 3, delay = 1000) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await apiCall();
    } catch (error) {
      if ((error.response && error.response.status === 502) ||
          (error.message && error.message.includes("socket hang up"))) {
        attempt++;
        if (attempt === retries) throw error;
        const errType = error.response && error.response.status === 502 ? "502" : "socket hang up";
        console.log(colors.yellow(`⚠️  Received ${errType} error. Retrying attempt ${attempt + 1} of ${retries}...`));
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

// Load wallets from utils/wallets.json
const loadWallets = () => {
  const walletsPath = path.join('utils', 'wallets.json');
  if (!fs.existsSync(walletsPath)) {
    fs.writeFileSync(walletsPath, JSON.stringify([]));
  }
  const data = fs.readFileSync(walletsPath, 'utf-8');
  return JSON.parse(data);
};

// Helper to extract Proxy ID from proxy string
const getProxyId = (proxy) => {
  try {
    return proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
  } catch (e) {
    return "N/A";
  }
};

// Configure Axios to use the proxy agent of the wallet
const setAxiosProxy = (proxy) => {
  const agent = new SocksProxyAgent(proxy);
  axios.defaults.httpAgent = agent;
  axios.defaults.httpsAgent = agent;
};

// Helpers to load and save proofs data from data/proofs.json
const proofsFile = path.join('data', 'proofs.json');
const loadProofs = () => {
  if (!fs.existsSync(proofsFile)) {
    fs.writeFileSync(proofsFile, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(proofsFile, 'utf-8'));
};

const saveProofs = (proofs) => {
  fs.writeFileSync(proofsFile, JSON.stringify(proofs, null, 2));
};

// Option 1: Complete NFTs Tasks
const completeNFTsTasks = async () => {
  const wallets = loadWallets();
  for (const walletData of wallets) {
    setAxiosProxy(walletData.proxy);
    const walletAddress = walletData.address;
    const proxyId = getProxyId(walletData.proxy);
    console.log(colors.green(`\n🔌 Using Proxy ID - [${proxyId}] For Wallet - [${walletAddress}]`));
    
    const walletInstance = new ethers.Wallet(walletData.privateKey);
    const currentTimestamp = Date.now();
    
    // Prepare messages for Premium and Basic tasks
    const premiumMessage = `I am claiming my SBT verification points for ${walletAddress} at ${currentTimestamp}`;
    const basicMessage = `I am claiming my SBT verification points for ${walletAddress} at ${currentTimestamp + 200}`;
    
    // Sign messages
    const premiumSignature = await walletInstance.signMessage(premiumMessage);
    const basicSignature = await walletInstance.signMessage(basicMessage);
    
    // Verify Premium Pass Task
    console.log(colors.cyan("🔄 Verifying Premium Pass Task..."));
    try {
      const premiumRes = await retryApiCall(
        () => verifyPremiumPass(premiumSignature, currentTimestamp, walletAddress),
        3,
        1000
      );
      console.log(colors.green("✅ Premium Pass Task Successfully Completed!"));
      console.log(colors.blue(`Message: ${premiumRes.data.message}`));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error(colors.red(`❌ Wallet - [${walletAddress}] Doesn't own Premium NFT please mint it first!`));
      } else if (error.response && error.response.status === 409) {
        console.log(colors.yellow("🟡 Premium Pass Task Already Completed!"));
        console.log(colors.blue(`Message: ${error.response.data.message}`));
      } else {
        console.error(colors.red(`❌ Error in Premium Pass Task for Wallet [${walletAddress}]: ${error.message}`));
      }
    }
    
    // Verify Basic Pass Task
    console.log(colors.cyan("🔄 Verifying Basic Pass Task..."));
    try {
      const basicRes = await retryApiCall(
        () => verifyBasicPass(basicSignature, currentTimestamp + 200, walletAddress),
        3,
        1000
      );
      console.log(colors.green("✅ Basic Pass Task Successfully Completed!"));
      console.log(colors.blue(`Message: ${basicRes.data.message}`));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error(colors.red(`❌ Wallet - [${walletAddress}] Doesn't own Basic NFT please mint it first!`));
      } else if (error.response && error.response.status === 409) {
        console.log(colors.yellow("🟡 Basic Pass Task Already Completed!"));
        console.log(colors.blue(`Message: ${error.response.data.message}`));
      } else {
        console.error(colors.red(`❌ Error in Basic Pass Task for Wallet [${walletAddress}]: ${error.message}`));
      }
    }
  }
};

// Option 2: Complete Proof Task
const completeProofTask = async () => {
  const wallets = loadWallets();
  let proofs = loadProofs();
  
  for (const walletData of wallets) {
    setAxiosProxy(walletData.proxy);
    const proxyId = getProxyId(walletData.proxy);
    const walletAddress = walletData.address;
    console.log(colors.green(`\n🔌 Using Proxy ID - [${proxyId}] For Wallet - [${walletAddress}]`));
    
    // Check if proof already exists for this wallet
    const proofRecordIndex = proofs.findIndex(p => p.address.toLowerCase() === walletAddress.toLowerCase());
    let proofRecord = proofs[proofRecordIndex];
    
    if (proofRecord && proofRecord.is_submitted) {
      console.log(colors.yellow(`🟡 Proof already submitted for Wallet - [${walletAddress}].`));
      if (proofRecord.is_verified) {
        console.log(colors.green("✅ Proof already verified."));
        continue;
      } else {
        console.log(colors.cyan("🔄 Verifying already submitted Proof..."));
      }
    } else {
      // Prompt for proof text if not already submitted
      const { proofText } = await inquirer.prompt([
        {
          type: 'input',
          name: 'proofText',
          message: '✏️  Please Insert your Proof Text (max 280 chars):',
          validate: (input) => input.length > 280 ? 'Proof text must be at most 280 characters.' : true
        }
      ]);
      // Create new proof record
      proofRecord = {
        address: walletAddress,
        proof: proofText,
        is_submitted: false,
        is_verified: false
      };
    }
    
    console.log(colors.cyan(`🚀 Sending Proof for Wallet - [${walletAddress}]`));
    const sendProofMessage = `I am submitting a proof for LayerEdge at ${new Date().toISOString()}`;
    const walletInstance = new ethers.Wallet(walletData.privateKey);
    const sendProofSignature = await walletInstance.signMessage(sendProofMessage);
    
    try {
      // Use retryApiCall with 2 retries for sendProof if error 502 or socket hang up occurs
      const sendProofRes = await retryApiCall(
        () => sendProof(walletAddress, sendProofMessage, proofRecord.proof, sendProofSignature),
        2,
        1000
      );
      console.log(colors.green("✅ Proof Submitted Correctly! API Response:"));
      console.log(colors.blue(JSON.stringify(sendProofRes.data, null, 2)));
      // Mark proof as submitted
      proofRecord.is_submitted = true;
      
      if (sendProofRes.status === 200) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const verifyMessage = `I am claiming my proof submission node points for ${walletAddress} at ${Date.now()}`;
        const verifySignature = await walletInstance.signMessage(verifyMessage);
        // Use retryApiCall with 2 retries for verifyProofSubmission if error 502 or socket hang up occurs
        const verifyRes = await retryApiCall(
          () => verifyProofSubmission(verifySignature, Date.now(), walletAddress),
          2,
          1000
        );
        console.log(colors.green("✅ Proof Submission Verification Response:"));
        console.log(colors.blue(JSON.stringify(verifyRes.data, null, 2)));
        proofRecord.is_verified = true;
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 429) {
          console.error(colors.red(`\n❌ Wallet - [${walletAddress}] Proof already submitted. Only can be submitted once.`));
          proofRecord.is_submitted = true;
        } else if (error.response.status === 404) {
          console.error(colors.red(`\n❌ Wallet - [${walletAddress}] Doesn't own Premium NFT please mint it first!`));
        } else {
          console.error(colors.red(`\n❌ Error in Proof Task for Wallet [${walletAddress}]: ${error.message}\n`));
        }
      } else {
        console.error(colors.red(`\n❌ Error in Proof Task for Wallet [${walletAddress}]: ${error.message}\n`));
      }
    }
    
    // Update proofs record
    const existingIndex = proofs.findIndex(p => p.address.toLowerCase() === walletAddress.toLowerCase());
    if (existingIndex > -1) {
      proofs[existingIndex] = proofRecord;
    } else {
      proofs.push(proofRecord);
    }
    saveProofs(proofs);
  }
};

// Option 3: Complete Node Task
const completeNodeTask = async () => {
  const wallets = loadWallets();
  for (const walletData of wallets) {
    setAxiosProxy(walletData.proxy);
    const walletAddress = walletData.address;
    const proxyId = getProxyId(walletData.proxy);
    console.log(colors.green(`\n🔌 Using Proxy ID - [${proxyId}] For Wallet - [${walletAddress}]`));
    
    console.log(colors.cyan("🔄 Verifying Node Task..."));
    const walletInstance = new ethers.Wallet(walletData.privateKey);
    const currentTimestamp = Date.now();
    const nodeMessage = `I am claiming my light node run task node points for ${walletAddress} at ${currentTimestamp}`;
    const nodeSignature = await walletInstance.signMessage(nodeMessage);
    
    try {
      const nodeRes = await retryApiCall(
        () => checkNodeTask(nodeSignature, currentTimestamp, walletAddress),
        2,
        1000
      );
      console.log(colors.green("✅ Node Task Successfully Completed"));
      console.log(colors.blue(JSON.stringify(nodeRes.data, null, 2)));
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(colors.yellow("🟡 Node Task is already completed"));
      } else {
        console.error(colors.red(`❌ Error in Node Task for Wallet [${walletAddress}]: ${error.message}`));
      }
    }
  }
};

// Main menu
const mainMenu = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'option',
      message: 'Select an option:',
      choices: ['Complete NFTs Tasks', 'Complete Proof Task', 'Complete Node Task', 'Exit']
    }
  ]);
  
  if (answers.option === 'Complete NFTs Tasks') {
    await completeNFTsTasks();
  } else if (answers.option === 'Complete Proof Task') {
    await completeProofTask();
  } else if (answers.option === 'Complete Node Task') {
    await completeNodeTask();
  } else {
    process.exit(0);
  }
  
  const again = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'repeat',
      message: '🔄 Do you want to perform another task?',
      default: true
    }
  ]);
  if (again.repeat) {
    mainMenu();
  } else {
    process.exit(0);
  }
};

mainMenu();
