// scripts/apis.js
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

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
    return response;
  } catch (error) {
    throw error;
  }
};

const registerWallet = async (walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/referral/register-wallet/4mCxH9Tf';
  const payload = { walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
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
    return response;
  } catch (error) {
    throw error;
  }
};

const startNode = async (walletAddress, signature, timestamp) => {
  const url = `https://referralapi.layeredge.io/api/light-node/node-action/${walletAddress}/start`;
  const payload = { sign: signature, timestamp };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    return response;
  } catch (error) {
    throw error;
  }
};

// Actualizamos getProxyIP para usar el proxy
const getProxyIP = async (proxy) => {
  const url = 'https://api.ipify.org?format=json';
  try {
    // Se crea un agente que enruta la petición a través del proxy
    const agent = new SocksProxyAgent(proxy);
    const response = await axios.get(url, { httpAgent: agent, httpsAgent: agent });
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

