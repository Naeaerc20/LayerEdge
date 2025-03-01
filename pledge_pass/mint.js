const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Importar configuración y ABI parcial desde ABI.js
const { RPC_URL, CHAIN_ID, TX_EXPLORER, PLEDGE_PASS, passABI } = require('./ABI.js');

// Función para obtener la configuración de fees recomendada
async function getGasSettings(provider) {
  const feeData = await provider.getFeeData();
  let baseFee = feeData.baseFeePerGas || feeData.maxFeePerGas;
  if (!baseFee) baseFee = ethers.BigNumber.from(0);
  // Agregar 15% al fee base
  const extra = baseFee.mul(15).div(100);
  const newFee = baseFee.add(extra);
  return {
    maxFeePerGas: newFee,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
  };
}

// Cargar todas las wallets desde utils/wallets.json
function loadWallets() {
  const walletsPath = path.join(__dirname, '..', 'utils', 'wallets.json');
  if (!fs.existsSync(walletsPath)) {
    console.log(colors.green("🚫 No wallets found in wallets.json"));
    process.exit(1);
  }
  const data = fs.readFileSync(walletsPath, 'utf-8');
  return JSON.parse(data);
}

// Procesar cada wallet: verificar NFTs y mintear los que hagan falta
async function processWallet(walletData) {
  const wallet = new ethers.Wallet(walletData.privateKey);
  console.log(colors.green(`\n🔗 Using Wallet - [${wallet.address}]`));

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const connectedWallet = wallet.connect(provider);

  console.log(colors.green("🔄 Verifying NFTs owned..."));

  // Crear instancia del contrato
  const contract = new ethers.Contract(PLEDGE_PASS, passABI, connectedWallet);

  // Consultar la cantidad de NFTs que posee la wallet
  const balanceBN = await contract.balanceOf(wallet.address);
  const balance = balanceBN.toNumber();
  console.log(colors.green(`NFTs owned: [${balance}]`));

  // Usar tierMint para verificar si ya se posee el NFT en cada tier
  const basicTokenIdBN = await contract.tierMint(wallet.address, 1);
  const premiumTokenIdBN = await contract.tierMint(wallet.address, 2);
  const basicTokenId = basicTokenIdBN.toNumber();
  const premiumTokenId = premiumTokenIdBN.toNumber();

  if (premiumTokenId !== 0)
    console.log(colors.green("✅ Premium NFT Found"));
  else
    console.log(colors.green("❌ Premium NFT not Found"));

  if (basicTokenId !== 0)
    console.log(colors.green("✅ Basic NFT Found"));
  else
    console.log(colors.green("❌ Basic NFT not Found"));

  // Si la wallet ya posee ambos NFT, no se necesita mintear
  if (premiumTokenId !== 0 && basicTokenId !== 0) {
    console.log(colors.green("🟢 No need to mint any NFT"));
    return;
  }

  // Se procede a mintear en el orden deseado: primero Premium y luego Basic
  if (premiumTokenId === 0) {
    console.log(colors.green("⏳ Minting Premium NFT - [Tier 2]"));
    await mintTier(connectedWallet, contract, 2);
  }
  if (basicTokenId === 0) {
    console.log(colors.green("⏳ Minting Basic NFT - [Tier 1]"));
    await mintTier(connectedWallet, contract, 1);
  }
}

// Función para mintear un NFT en un determinado tier
async function mintTier(connectedWallet, contract, tier) {
  try {
    // Obtener el fee de minteo para el tier
    const feeBN = await contract.tierMintFee(tier);
    // Obtener la configuración de fees
    const feeSettings = await getGasSettings(connectedWallet.provider);

    // Estimar el gas necesario para la transacción de minteo
    const estimatedGas = await contract.estimateGas.mint(tier, connectedWallet.address, {
      value: feeBN
    });
    console.log(colors.green(`🔎 Estimated Gas for Tier ${tier} mint: ${estimatedGas.toString()}`));

    // Enviar la transacción usando el gas estimado y la configuración de fees
    const tx = await contract.mint(tier, connectedWallet.address, {
      value: feeBN,
      gasLimit: estimatedGas,
      maxFeePerGas: feeSettings.maxFeePerGas,
      maxPriorityFeePerGas: feeSettings.maxPriorityFeePerGas
    });
    console.log(colors.green(`🚀 Mint Tx Sent! - [${TX_EXPLORER}/${tx.hash}]`));

    // Esperar confirmación de la transacción
    const receipt = await tx.wait();
    console.log(colors.green(`✅ Tx Confirmed in Block - [${receipt.blockNumber}]`));
  } catch (error) {
    const errorMsg = error.message || "";
    const nestedErrorMsg = (error.error && error.error.message) ? error.error.message : "";

    if (errorMsg.includes("CALL_EXCEPTION") || nestedErrorMsg.includes("CALL_EXCEPTION")) {
      console.log(colors.green("❌ Mint Tx Failed with CALL_EXCEPTION"));
    } else if (errorMsg.includes("INSUFFICIENT_FUNDS") || nestedErrorMsg.includes("INSUFFICIENT_FUNDS")) {
      console.log(colors.green(`💸 Wallet - [${connectedWallet.address}] doesn't own funds to mint NFTs`));
    } else {
      console.log(colors.green(`❌ Mint Tx Failed: ${errorMsg}`));
    }
  }
}

async function main() {
  const wallets = loadWallets();
  if (wallets.length === 0) {
    console.log(colors.green("🚫 No wallets available in wallets.json."));
    process.exit(1);
  }
  // Procesa cada wallet de forma secuencial
  for (const walletData of wallets) {
    await processWallet(walletData);
  }
}

main().catch(err => {
  console.error(colors.green("⚠️  An error occurred:"), err);
});
