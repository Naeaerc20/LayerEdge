const consoleClear = require('console-clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { registerWallet, startNode, getProxyIP, claimDailyPoints } = require('./scripts/apis');
const ethers = require('ethers');
const colors = require('colors');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Se reintentan solo los errores de "socket hang up", ECONNRESET, 502 y 504.
const retryOperation = async (operation, maxRetries = 1, delayTime = 1000, wallet = null, proxies = null) => {
  let phase = 1;
  while (phase <= 2) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        if (
          (error.message && error.message.includes("socket hang up")) ||
          error.code === 'ECONNRESET' ||
          (error.response && (error.response.status === 502 || error.response.status === 504))
        ) {
          attempts++;
          const errCode = error.response ? error.response.status : (error.code || 'N/A');
          console.log(`Retry error for wallet [${wallet ? wallet.address : 'N/A'}] with error code [${errCode}]. Attempt ${attempts} of ${maxRetries} in phase ${phase}.`);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
          }
        }
        throw error;
      }
    }
    if (wallet && proxies && phase === 1) {
      const currentProxy = wallet.proxy;
      const currentIndex = proxies.indexOf(currentProxy);
      const nextIndex = (currentIndex + 1) % proxies.length;
      wallet.proxy = proxies[nextIndex];
      console.log(`Exceeded ${maxRetries} retries with current proxy. Changing proxy for wallet [${wallet.address}] to ${wallet.proxy}`);
      phase++;
    } else {
      break;
    }
  }
  throw new Error("Operation failed after retries and proxy change");
};

const loadActivated = () => {
  const filePath = path.join('data', 'activated.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const saveActivated = (activated) => {
  const filePath = path.join('data', 'activated.json');
  fs.writeFileSync(filePath, JSON.stringify(activated, null, 2));
};

const loadRegistered = () => {
  const filePath = path.join('data', 'registered.json');
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const saveRegistered = (registered) => {
  const filePath = path.join('data', 'registered.json');
  fs.writeFileSync(filePath, JSON.stringify(registered, null, 2));
};

const displayBanner = () => {
  consoleClear();
  console.log(figlet.textSync('LayerEdge', { horizontalLayout: 'default', verticalLayout: 'default' }).green);
  console.log(colors.green("\n👋 Welcome to LayerEdge Auto Activator Code"));
  console.log(colors.green("🏆 Created by Naeaex - x.com/naeaexeth - www.github.com/Naeaerc20 \n"));
};

const loadProxies = () => {
  const proxiesPath = path.join('utils', 'proxies.txt');
  const data = fs.readFileSync(proxiesPath, 'utf-8');
  return data.split('\n').filter(line => line.trim() !== '');
};

const loadWallets = () => {
  const walletsPath = path.join('utils', 'wallets.json');
  if (!fs.existsSync(walletsPath)) {
    fs.writeFileSync(walletsPath, JSON.stringify([]));
  }
  const data = fs.readFileSync(walletsPath, 'utf-8');
  return JSON.parse(data);
};

const registerAccounts = async () => {
  const wallets = loadWallets();
  const proxies = loadProxies();
  const registered = loadRegistered();
  for (const wallet of wallets) {
    const isRegistered = registered.find(r => r.address === wallet.address && r.is_registered);
    if (isRegistered) continue;
    if (!wallet.proxy) {
      wallet.proxy = proxies[(wallet.id - 1) % proxies.length];
    }
    try {
      const ip = await retryOperation(() => getProxyIP(wallet.proxy), 5, 1000, wallet, proxies);
      let proxyId = "N/A";
      try {
        proxyId = wallet.proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
      } catch (e) {}
      console.log(`⚙️  Using Proxy ID - [${proxyId}]`);
    } catch (error) {
      console.log(`🔴 Failed to retrieve IP for Wallet [${wallet.address}] after retries. Proceeding with registration attempt.`);
    }
    console.log(`⚙️  Registering Wallet - [${wallet.address}]`);
    try {
      const response = await retryOperation(() => registerWallet(wallet.address), 5, 1000, wallet, proxies);
      if (response.data.message === "registered wallet address successfully") {
        console.log(`🟢 Wallet [${wallet.address}] - Has been successfully Registered\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: true });
      } else {
        console.log(`🔴 Register Failed for Wallet - [${wallet.address}] code [${response.status || 'N/A'}] API Response: ${JSON.stringify(response.data)}\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: false });
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(`⚠️  Wallet [${wallet.address}] is already registered (409).\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: true });
      } else {
        const code = error.response ? error.response.status : 'N/A';
        const apiResponse = error.response ? JSON.stringify(error.response.data) : error.message;
        console.log(`🔴 Register Failed for Wallet - [${wallet.address}] code [${code}] API Response: ${apiResponse}\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: false });
      }
    }
    saveRegistered(registered);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  await inquirer.prompt([{ type: 'input', name: 'enter', message: 'Press Enter to return to the main menu...' }]);
  mainMenu();
};

const performActivation = async (wallet) => {
  const activated = loadActivated();
  const activationRecord = activated.find(a => a.address === wallet.address);
  const currentTimestamp = Date.now();
  if (activationRecord && (currentTimestamp - activationRecord.last_activation < 24 * 60 * 60 * 1000)) {
    console.log(`⏱  Wallet [${wallet.address}] was activated less than 24 hours ago. Skipping activation.\n`);
    return;
  }
  try {
    const proxies = loadProxies();
    const ip = await retryOperation(() => getProxyIP(wallet.proxy), 5, 1000, wallet, proxies);
    let proxyId = "N/A";
    try {
      proxyId = wallet.proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
    } catch (e) {}
    console.log(`⚙️  Using Proxy ID - [${proxyId}]`);
  } catch (error) {
    console.log(`🔴 Failed to retrieve IP for Wallet [${wallet.address}] after retries. Skipping activation.\n`);
    return;
  }
  console.log(`🔄 Activating Node For Wallet - [${wallet.address}]`);
  try {
    const timestamp = Date.now();
    const message = `Node activation request for ${wallet.address} at ${timestamp}`;
    const walletInstance = new ethers.Wallet(wallet.privateKey);
    const signature = await walletInstance.signMessage(message);
    let response;
    try {
      // Se reintenta hasta 3 veces (intento inicial + 2 reintentos) para errores 502/504, etc.
      response = await retryOperation(() => startNode(wallet.address, signature, timestamp), 3, 1000, wallet, loadProxies());
    } catch (error) {
      const code = error.response ? error.response.status : 'N/A';
      const apiResponse = error.response ? JSON.stringify(error.response.data) : error.message;
      console.log(`🔴 Node Activation Failed for Wallet - [${wallet.address}] code [${code}] API Response: ${apiResponse}\n`);
      return;
    }
    if (response.data.message === "node action executed successfully") {
      console.log(`🤖 Node Successfully Activated - come back tomorrow\n`);
      if (activationRecord) {
        activationRecord.last_activation = timestamp;
      } else {
        activated.push({ address: wallet.address, last_activation: timestamp });
      }
      saveActivated(activated);
    } else {
      console.log(`🔴 Node Activation Failed for Wallet - [${wallet.address}] API Response: ${JSON.stringify(response.data)}\n`);
    }
  } catch (error) {
    const code = error.response ? error.response.status : 'N/A';
    const apiResponse = error.response ? JSON.stringify(error.response.data) : error.message;
    console.log(`🔴 Node Activation Failed for Wallet - [${wallet.address}] code [${code}] API Response: ${apiResponse}\n`);
  }
};

const performDailyNodeActivation = async () => {
  const wallets = loadWallets();
  for (const wallet of wallets) {
    await performActivation(wallet);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

const performDailyPointClaiming = async () => {
  const wallets = loadWallets();
  const proxies = loadProxies();
  for (const wallet of wallets) {
    let proxyId = "N/A";
    try {
      proxyId = wallet.proxy.split('zone-custom-session-')[1].split('-sessTime')[0];
    } catch (e) {}
    console.log(`⚙️  Using Proxy ID - [${proxyId}]`);
    console.log(`🧷 Claiming Daily Points for Wallet - [${wallet.address}]`);
    try {
      const timestamp = Date.now();
      const message = `I am claiming my daily node point for ${wallet.address} at ${timestamp}`;
      const walletInstance = new ethers.Wallet(wallet.privateKey);
      const signature = await walletInstance.signMessage(message);
      const agent = new SocksProxyAgent(wallet.proxy);
      // Se reintenta hasta 3 veces para errores 502/504, etc.
      const response = await retryOperation(
        () => claimDailyPoints(wallet.address, signature, timestamp, { httpAgent: agent, httpsAgent: agent }),
        3,
        1000,
        wallet,
        proxies
      );
      if (response.data.message === "node points claimed successfully") {
        console.log(`💼 Wallet [${wallet.address}] - Has successfully claimed daily points.\n`);
      } else {
        console.log(`🔴 Daily Point Claim Failed for Wallet - [${wallet.address}] API Response: ${JSON.stringify(response.data)}\n`);
      }
    } catch (error) {
      const code = error.response ? error.response.status : 'N/A';
      const apiResponse = error.response ? JSON.stringify(error.response.data) : error.message;
      console.log(`🔴 Daily Point Claim Failed for Wallet - [${wallet.address}] code [${code}] API Response: ${apiResponse}\n`);
    }
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
      setInterval(async () => {
        await performDailyNodeActivation();
        await performDailyPointClaiming();
        console.log("✅ Workflow completed today! - Waiting 24 hours for next run.");
      }, 24 * 60 * 60 * 1000);
      await performDailyNodeActivation();
      await performDailyPointClaiming();
      console.log("✅ Workflow completed today! - Waiting 24 hours for next run.");
    } else {
      await performDailyNodeActivation();
      await performDailyPointClaiming();
      console.log("✅ Workflow completed today! - Waiting 24 hours for next run.");
    }
  } else if (answers.option === 'Register Accounts') {
    await registerAccounts();
  } else {
    process.exit(0);
  }
};

mainMenu();
