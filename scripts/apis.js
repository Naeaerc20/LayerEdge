// scripts/apis.js
const axios = require('axios');

const commonHeaders = {
  'Content-Type': 'application/json',
  'origin': 'https://dashboard.layeredge.io',
  'referer': 'https://dashboard.layeredge.io/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

const validateRefCode = async (invite_code = "4mCxH9Tf") => {
  const url = 'https://referralapi.layeredge.io/api/referral/verify-referral-code';
  const payload = { invite_code };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    // Se espera que response.data.data.valid sea true
    return response;
  } catch (error) {
    throw error;
  }
};

const registerWallet = async (walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/referral/register-wallet/4mCxH9Tf'; // changeable
  const payload = { walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    // Se filtra response.data.message === "registered wallet address successfully"
    return response;
  } catch (error) {
    throw error;
  }
};

const verifyCaptcha = async (captchaToken) => {
  const url = 'https://dashboard.layeredge.io/api/verify-captcha';
  const payload = { token: captchaToken };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    // Se espera que response.data.success sea true
    return response;
  } catch (error) {
    throw error;
  }
};

const startNode = async (walletAddress, signature, timestamp) => {
  // Reemplazamos $ADDRESS en la URL con la dirección de la wallet
  const url = `https://referralapi.layeredge.io/api/light-node/node-action/${walletAddress}/start`;
  const payload = { sign: signature, timestamp };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    // Se filtra que response.data.message === "node action executed successfully"
    return response;
  } catch (error) {
    throw error;
  }
};

const getProxyIP = async () => {
  const url = 'https://api.ipify.org?format=json';
  try {
    const response = await axios.get(url);
    return response.data.ip;
  } catch (error) {
    throw error;
  }
};

const claimDailyPoints = async (walletAddress, signature, timestamp) => {
  const url = 'https://referralapi.layeredge.io/api/light-node/claim-node-points';
  const payload = { sign: signature, timestamp, walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    // Se filtra que response.data.message === "node points claimed successfully"
    return response;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  validateRefCode,
  registerWallet,
  verifyCaptcha,
  startNode,
  getProxyIP,
  claimDailyPoints
};
