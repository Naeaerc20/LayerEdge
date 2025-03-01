const fs = require('fs');
const ethers = require('ethers');
const inquirer = require('inquirer');
const path = require('path');

const walletPath = path.join(__dirname, 'wallets.json');
const proxiesPath = path.join(__dirname, 'proxies.txt');

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

const generateWallets = async () => {
  const { count } = await inquirer.prompt([
    {
      type: 'number',
      name: 'count',
      message: '💰 How many wallets do you want to generate?',
      validate: value => value > 0 ? true : '⚠️  Please enter a positive number'
    }
  ]);

  const wallets = loadWallets();
  const proxies = getProxies();
  const currentMax = wallets.length > 0 ? Math.max(...wallets.map(w => w.id)) : 0;
  let nextId = currentMax + 1;

  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    const id = nextId++;
    const proxy = proxies[id - 1] || "";
    wallets.push({
      id,
      address: wallet.address,
      privateKey: wallet.privateKey,
      proxy
    });
  }

  saveWallets(wallets);
  console.log(`💾 Wallets have been generated and saved to wallets.json`);
};

generateWallets();
