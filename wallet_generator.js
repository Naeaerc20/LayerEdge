const fs = require('fs');
const ethers = require('ethers');

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

const generateWallets = async () => {
    const answers = await require('inquirer').prompt([
        {
            type: 'number',
            name: 'count',
            message: 'How many wallets do you want to generate?',
            validate: value => value > 0 ? true : 'Enter a positive number'
        }
    ]);

    const count = answers.count;
    const proxies = loadProxies();
    const wallets = loadWallets();
    const startId = wallets.length + 1;

    for (let i = 0; i < count; i++) {
        const wallet = ethers.Wallet.createRandom();
        const id = startId + i;
        const proxy = proxies[(id - 1) % proxies.length];
        wallets.push({
            id: id,
            address: wallet.address,
            privateKey: wallet.privateKey,
            proxy: proxy
        });
    }

    saveWallets(wallets);
    console.log(`${count} wallets have been generated and saved to wallets.json`);
};

generateWallets();
