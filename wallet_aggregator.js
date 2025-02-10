// wallet_aggregator.js
const fs = require('fs');
const readlineSync = require('readline-sync');

const loadProxies = () => {
  const data = fs.readFileSync('proxies.txt', 'utf-8');
  return data.split('\n').filter(line => line.trim() !== '');
};

const loadWallets = () => {
  if (!fs.existsSync('wallets.json')) {
    fs.writeFileSync('wallets.json', JSON.stringify([]));
  }
  const data = fs.readFileSync('wallets.json', 'utf-8');
  return JSON.parse(data);
};

const saveWallets = (wallets) => {
  fs.writeFileSync('wallets.json', JSON.stringify(wallets, null, 2));
};

const aggregateWallets = () => {
  const wallets = loadWallets();
  const proxies = loadProxies();
  // Si las wallets ya tienen id, se usa ese valor; de lo contrario se asigna consecutivamente.
  const startId = wallets.length ? wallets.length + 1 : 1;

  wallets.forEach((wallet, index) => {
    // Si no existe id, asignarla (esto es opcional si ya se generan en el generador)
    if (!wallet.id) {
      wallet.id = startId + index;
    }
    // Si no se ha guardado el privateKey, se solicita al usuario
    if (!wallet.privateKey) {
      wallet.privateKey = readlineSync.question(
        `Please enter the private key for wallet ${wallet.id}: `
      );
    }
    // Asegurarse de asignar un proxy a cada wallet (si no existe o se desea re–asignar)
    wallet.proxy = proxies[(wallet.id - 1) % proxies.length];
  });

  saveWallets(wallets);
  console.log(`Wallets have been aggregated and saved to wallets.json`);
};

aggregateWallets();
