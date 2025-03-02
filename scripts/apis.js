const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');

const commonHeaders = {
  'Content-Type': 'application/json',
  'origin': 'https://dashboard.layeredge.io',
  'referer': 'https://dashboard.layeredge.io/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

const validateRefCode = async (invite_code = "VH4CVO73") => {
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
  const url = 'https://referralapi.layeredge.io/api/referral/register-wallet/VH4CVO73';
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

const getProxyIP = async (proxy) => {
  const url = 'https://api.ipify.org?format=json';
  try {
    const agent = new SocksProxyAgent(proxy);
    const response = await axios.get(url, { httpAgent: agent, httpsAgent: agent });
    return response.data.ip;
  } catch (error) {
    throw error;
  }
};

const claimDailyPoints = async (walletAddress, signature, timestamp, axiosOptions = {}) => {
  const url = 'https://referralapi.layeredge.io/api/light-node/claim-node-points';
  const payload = { sign: signature, timestamp, walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders, ...axiosOptions });
    return response;
  } catch (error) {
    throw error;
  }
};

const verifyPremiumPass = async (messageSigned, timestamp, walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/task/nft-verification/2';
  const payload = { sign: messageSigned, timestamp, walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    return response;
  } catch (error) {
    throw error;
  }
};

const verifyBasicPass = async (messageSigned, timestamp, walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/task/nft-verification/1';
  const payload = { sign: messageSigned, timestamp, walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    return response;
  } catch (error) {
    throw error;
  }
};

const verifyProofSubmission = async (messageSigned, timestamp, walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/task/proof-submission';
  const payload = { sign: messageSigned, timestamp, walletAddress };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    return response;
  } catch (error) {
    throw error;
  }
};

const sendProof = async (address, message, proof, messageSigned) => {
  const url = 'https://dashboard.layeredge.io/api/send-proof';
  const payload = { address, message, proof, signature: messageSigned };
  try {
    const response = await axios.post(url, payload, { headers: commonHeaders });
    return response;
  } catch (error) {
    throw error;
  }
};

const checkNodeTask = async (messageSigned, timestamp, walletAddress) => {
  const url = 'https://referralapi.layeredge.io/api/task/node-points';
  const payload = { sign: messageSigned, timestamp, walletAddress };
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
  claimDailyPoints,
  verifyPremiumPass,
  verifyBasicPass,
  verifyProofSubmission,
  sendProof,
  checkNodeTask
};
