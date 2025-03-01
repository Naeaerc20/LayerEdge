const fs = require('fs');
const inquirer = require('inquirer');
const ethers = require('ethers');
const path = require('path');

const walletPath = path.join(__dirname, 'wallets.json');
const proxiesPath = path.join(__dirname, 'proxies.txt');

// Función para leer los proxies desde proxies.txt
const getProxies = () => {
  if (!fs.existsSync(proxiesPath)) {
    console.log("⚠️  No proxies.txt found. All wallets will have an empty proxy.");
    return [];
  }
  return fs.readFileSync(proxiesPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

const loadWallets = () => {
  if (!fs.existsSync(walletPath)) {
    fs.writeFileSync(walletPath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
};

const saveWallets = (wallets) => {
  fs.writeFileSync(walletPath, JSON.stringify(wallets, null, 2));
};

const aggregateWallets = async () => {
  const wallets = loadWallets();
  const proxies = getProxies();
  // Calcula el id siguiente basado en el máximo de los ids existentes
  const currentMax = wallets.length > 0 ? Math.max(...wallets.map(w => w.id)) : 0;
  let nextId = currentMax + 1;
  let continueAdding = true;

  while (continueAdding) {
    const { privateKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'privateKey',
        message: `🔑 Please enter the private key for wallet ${nextId}:`
      }
    ]);

    try {
      const walletInstance = new ethers.Wallet(privateKey);
      const address = walletInstance.address;
      // Asigna el proxy basado en el id (si existe; de lo contrario, cadena vacía)
      const proxy = proxies[nextId - 1] || "";
      wallets.push({
        id: nextId,
        address,
        privateKey,
        proxy
      });
      console.log(`✅ Wallet added ID - [${nextId}] - Address - [${address}]`);
      nextId++;
    } catch (error) {
      console.log("❌ Error: Invalid private key. Please try again.");
    }

    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: '➕ Do you want to add another wallet? (y/n)',
        default: false
      }
    ]);

    continueAdding = addAnother;
    if (continueAdding) console.log('');
  }

  saveWallets(wallets);
  console.log("\n💾 Wallets have been aggregated and saved to wallets.json");
};

aggregateWallets();
