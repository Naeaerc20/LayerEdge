const consoleClear = require('console-clear');
const figlet = require('figlet');
const inquirer = require('inquirer');
const fs = require('fs');
const { registerWallet, startNode, getProxyIP, claimDailyPoints } = require('./scripts/apis');
const ethers = require('ethers');
const colors = require('colors');
const { SocksProxyAgent } = require('socks-proxy-agent');

const retryOperation = async (operation, maxRetries = 1, delayTime = 1000, wallet = null, proxies = null) => {
  let phase = 1;
  while (phase <= 2) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        if ((error.message && error.message.includes("socket hang up")) || error.code === 'ECONNRESET') {
          attempts++;
          console.log(`Socket hang up error for wallet [${wallet ? wallet.address : 'N/A'}]. Attempt ${attempts} of ${maxRetries} in phase ${phase}.`);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
          }
        } else if (error.response && [400, 401, 403, 405, 410].includes(error.response.status)) {
          throw error;
        } else {
          attempts++;
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delayTime));
            continue;
          } else {
            throw error;
          }
        }
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
  if (!fs.existsSync('activated.json')) {
    fs.writeFileSync('activated.json', JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync('activated.json', 'utf-8'));
};

const saveActivated = (activated) => {
  fs.writeFileSync('activated.json', JSON.stringify(activated, null, 2));
};

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
      const response = await retryOperation(() => registerWallet(wallet.address));
      if (response.data.message === "registered wallet address successfully") {
        console.log(`🟢 Wallet [${wallet.address}] - Has been successfully Registered\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: true });
      } else {
        console.log(`🔴 Wallet [${wallet.address}] - Registration Failed\n`);
        registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: false });
      }
    } catch (error) {
      console.log(`🔴 Wallet [${wallet.address}] - Registration Failed after retries\n`);
      registered.push({ address: wallet.address, proxy: wallet.proxy, is_registered: false });
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
      response = await retryOperation(() => startNode(wallet.address, signature, timestamp));
    } catch (error) {
      if (error.response && [400, 401, 403, 405, 410].includes(error.response.status)) {
        console.log(`⚠️  Node for Wallet [${wallet.address}] already active (${error.response.status}). Skipping activation.\n`);
        if (activationRecord) {
          activationRecord.last_activation = timestamp;
        } else {
          activated.push({ address: wallet.address, last_activation: timestamp });
        }
        saveActivated(activated);
        return;
      } else {
        throw error;
      }
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
      console.log(`🔴 Node Activation Failed for Wallet [${wallet.address}]\n`);
    }
  } catch (error) {
    console.log(`🔴 Node Activation Failed for Wallet [${wallet.address}]\n`);
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
      const response = await retryOperation(
        () => claimDailyPoints(wallet.address, signature, timestamp, { httpAgent: agent, httpsAgent: agent }),
        5,
        1000,
        wallet,
        proxies
      );
      if (response.data.message === "node points claimed successfully") {
        console.log(`💼 Wallet [${wallet.address}] - Has successfully claimed daily points.\n`);
      } else {
        console.log(`🔴 Points has already been claimed for Wallet - [${wallet.address}]\n`);
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`🔴 Points has already been claimed for Wallet - [${wallet.address}]\n`);
      } else {
        console.log(`🔴 Points has already been claimed for Wallet -  [${wallet.address}]\n`);
      }
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
