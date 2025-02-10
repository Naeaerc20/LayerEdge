// index.js
const consoleClear = require('console-clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const { 
  registerWallet, 
  startNode, 
  getProxyIP, 
  claimDailyPoints 
} = require('./scripts/apis');
const ethers = require('ethers');
const colors = require('colors');

const displayBanner = () => {
  consoleClear();
  console.log(figlet.textSync('LayerEdge', { horizontalLayout: 'default', verticalLayout: 'default' }).green);
  console.log(colors.green("\n👋 Welcome to LayerEdge Auto Activator Code"));
  console.log(colors.green("🏆 Created by Naeaex - x.com/naeaexeth - www.github.com/Naeaerc20 \n"));
};

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

const loadRegistered = () => {
  if (!fs.existsSync('registered.json')) {
    fs.writeFileSync('registered.json', JSON.stringify([]));
  }
  const data = fs.readFileSync('registered.json', 'utf-8');
  return JSON.parse(data);
};

const saveRegistered = (registered) => {
  fs.writeFileSync('registered.json', JSON.stringify(registered, null, 2));
};

const registerAccounts = async () => {
  const wallets = loadWallets();
  const proxies = loadProxies();
  const registered = loadRegistered();

  for (const wallet of wallets) {
    // Si ya está registrada, se omite
    const isRegistered = registered.find(r => r.address === wallet.address && r.is_registered);
    if (isRegistered) continue;

    // Asegurarse de que cada wallet tenga asignado un proxy
    if (!wallet.proxy) {
      wallet.proxy = proxies[(wallet.id - 1) % proxies.length];
    }
    const proxy = wallet.proxy;
    let proxyId = "N/A";
    try {
      proxyId = proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
    } catch (e) { /* Si falla, se mantiene "N/A" */ }

    // Se obtiene la IP pública a través del proxy
    const ip = await getProxyIP(proxy);
    console.log(`💻 Using Proxy ID: [${proxyId}] - Public IP [${ip}]`);
    console.log(`⚙️  Registering Wallet - [${wallet.address}]`);

    try {
      const response = await registerWallet(wallet.address);
      if (response.data.message === "registered wallet address successfully") {
        console.log(`🟢 Wallet [${wallet.address}] - Has been successfully Registered \n`);
        registered.push({ address: wallet.address, proxy: proxy, is_registered: true });
      } else {
        console.log(`🔴 Wallet [${wallet.address}] - Registration Failed \n`);
        registered.push({ address: wallet.address, proxy: proxy, is_registered: false });
      }
    } catch (error) {
      console.log(`🔴 Wallet [${wallet.address}] - Registration Failed \n`);
      registered.push({ address: wallet.address, proxy: proxy, is_registered: false });
    }

    saveRegistered(registered);
    // Retraso de 5 segundos entre cada registro
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await inquirer.prompt([
    {
      type: 'input',
      name: 'enter',
      message: 'Press Enter to return to the main menu...'
    }
  ]);

  mainMenu();
};

const performActivation = async (wallet) => {
  const proxy = wallet.proxy;
  let proxyId = "N/A";
  try {
    proxyId = proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
  } catch (e) { }
  // Obtener la IP del proxy
  const ip = await getProxyIP(proxy);
  console.log(`💻 Using Proxy ID: [${proxyId}] - Public IP [${ip}]`);
  console.log(`🔄 Activating Node For Wallet - [${wallet.address}]`);

  try {
    const timestamp = Date.now();
    const message = `Node activation request for ${wallet.address} at ${timestamp}`;
    const walletInstance = new ethers.Wallet(wallet.privateKey);
    const signature = await walletInstance.signMessage(message);

    const response = await startNode(wallet.address, signature, timestamp);
    if (response.data.message === "node action executed successfully") {
      console.log(`🤖 Node Successfully Activated - come back tomorrow \n`);
    } else {
      console.log(`🔴 Node Activation Failed for Wallet [${wallet.address}] \n`);
    }
  } catch (error) {
    console.log(`🔴 Node Activation Failed for Wallet [${wallet.address}] \n`);
  }
};

const performDailyNodeActivation = async () => {
  const wallets = loadWallets();
  for (const wallet of wallets) {
    await performActivation(wallet);
    // Esperar 5 segundos entre cada activación
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

const performDailyPointClaiming = async () => {
  const wallets = loadWallets();
  for (const wallet of wallets) {
    try {
      console.log(`🧷 Claiming Daily Points for Wallet - [${wallet.address}]`);
      const timestamp = Date.now();
      const message = `I am claiming my daily node point for ${wallet.address} at ${timestamp}`;
      const walletInstance = new ethers.Wallet(wallet.privateKey);
      const signature = await walletInstance.signMessage(message);

      const response = await claimDailyPoints(wallet.address, signature, timestamp);
      if (response.data.message === "node points claimed successfully") {
        console.log(`💼 Wallet [${wallet.address}] - Has successfully claimed daily points.\n`);
      } else {
        console.log(`🔴 Failed to Claim Points for Wallet [${wallet.address}] \n`);
      }
    } catch (error) {
      console.log(`🔴 Failed to Claim Points for Wallet [${wallet.address}] \n`);
    }
    // Esperar 5 segundos entre cada reclamo
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

const mainMenu = async () => {
  displayBanner();
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'option',
      message: 'Select an option:',
      choices: ['Perform Daily Node Activation', 'Register Accounts', 'Exit']
    }
  ]);

  if (answers.option === 'Perform Daily Node Activation') {
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'daily',
        message: 'Activate nodes every 24 hours?',
        default: true
      }
    ]);

    if (confirm.daily) {
      // Ejecuta ahora y programa la repetición cada 24 horas (24*60*60*1000)
      setInterval(async () => {
        await performDailyNodeActivation();
        await performDailyPointClaiming();
      }, 24 * 60 * 60 * 1000);
      await performDailyNodeActivation();
      await performDailyPointClaiming();
    } else {
      await performDailyNodeActivation();
      await performDailyPointClaiming();
    }
  } else if (answers.option === 'Register Accounts') {
    await registerAccounts();
  } else {
    process.exit(0);
  }
};

mainMenu();

