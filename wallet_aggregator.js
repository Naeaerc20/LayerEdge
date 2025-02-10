// wallet_aggregator.js
const fs = require('fs');
const inquirer = require('inquirer');
const ethers = require('ethers'); // Asegúrate de tener ethers instalado: npm install ethers

// Función para cargar los proxies desde proxies.txt
const loadProxies = () => {
  const data = fs.readFileSync('proxies.txt', 'utf-8');
  return data.split('\n').filter(line => line.trim() !== '');
};

// Función para cargar las wallets desde wallets.json (crea el archivo si no existe)
const loadWallets = () => {
  if (!fs.existsSync('wallets.json')) {
    fs.writeFileSync('wallets.json', JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync('wallets.json', 'utf-8'));
};

// Función para guardar las wallets en wallets.json
const saveWallets = (wallets) => {
  fs.writeFileSync('wallets.json', JSON.stringify(wallets, null, 2));
};

const aggregateWallets = async () => {
  const proxies = loadProxies();
  const wallets = loadWallets();
  let nextId = wallets.length > 0 ? wallets[wallets.length - 1].id + 1 : 1;
  let continueAdding = true;

  while (continueAdding) {
    // Solicitar el private key para la nueva wallet
    const { privateKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'privateKey',
        message: `Please enter the private key for wallet ${nextId}:`
      }
    ]);

    try {
      // Crear la wallet para obtener la dirección usando ethers
      const walletInstance = new ethers.Wallet(privateKey);
      const address = walletInstance.address;
      // Asignar un proxy de forma cíclica según el ID
      const proxy = proxies[(nextId - 1) % proxies.length];

      // Agregar la wallet al arreglo
      wallets.push({
        id: nextId,
        address,
        privateKey,
        proxy
      });

      console.log(`Wallet added: ID ${nextId} - Address: ${address} - Proxy: ${proxy}`);
      nextId++; // Incrementar ID para la siguiente wallet

    } catch (error) {
      console.log("Error creating wallet. Please check the private key and try again.");
    }

    // Preguntar si se desea agregar otra wallet
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

  // Guardar el arreglo de wallets en wallets.json
  saveWallets(wallets);
  console.log("Wallets have been aggregated and saved to wallets.json");
};

aggregateWallets();
