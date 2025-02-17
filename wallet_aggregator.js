const fs = require('fs');
const inquirer = require('inquirer');
const ethers = require('ethers');

// Function to load proxies from proxies.txt
const loadProxies = () => {
  try {
    const data = fs.readFileSync('proxies.txt', 'utf-8');
    return data.split('\n').filter(line => line.trim() !== '');
  } catch (err) {
    console.error('Error reading proxies.txt:', err);
    return [];
  }
};

// Function to load wallets from wallets.json (creates the file if it doesn't exist)
const loadWallets = () => {
  if (!fs.existsSync('wallets.json')) {
    fs.writeFileSync('wallets.json', JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync('wallets.json', 'utf-8'));
};

// Function to save wallets to wallets.json
const saveWallets = (wallets) => {
  fs.writeFileSync('wallets.json', JSON.stringify(wallets, null, 2));
};

const aggregateWallets = async () => {
  const proxies = loadProxies();
  if (proxies.length === 0) {
    console.error("No proxies found in proxies.txt. Please add at least one.");
    return;
  }
  const wallets = loadWallets();
  let nextId = wallets.length > 0 ? wallets[wallets.length - 1].id + 1 : 1;
  let continueAdding = true;

  while (continueAdding) {
    const { privateKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'privateKey',
        message: `Enter the private key for wallet ${nextId}:`
      }
    ]);

    try {
      const walletInstance = new ethers.Wallet(privateKey);
      const address = walletInstance.address;
      const proxy = proxies[(nextId - 1) % proxies.length];

      const newWallet = {
        id: nextId,
        address,
        privateKey,
        proxy
      };

      wallets.push(newWallet);
      console.log(`Wallet added: ID ${nextId} - Address: ${address} - Proxy: ${proxy}`);
      nextId++;
    } catch (error) {
      console.log("Error creating wallet. Please check the private key and try again.");
    }

    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Do you want to add another wallet?',
        default: false
      }
    ]);

    continueAdding = addAnother;
  }

  saveWallets(wallets);
  console.log("Wallets have been saved to wallets.json");
};

aggregateWallets();
