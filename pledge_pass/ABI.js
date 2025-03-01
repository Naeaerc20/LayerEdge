// ABI.js

module.exports = {
  RPC_URL: "https://base-mainnet.g.alchemy.com/v2/t_qjVdhjAo-ygO6wAiQIu_bOiJ7BopN5",
  CHAIN_ID: 8453,
  TX_EXPLORER: "https://basescan.org/tx/",
  PLEDGE_PASS: "0xb06C68C8f9DE60107eAbda0D7567743967113360",
  passABI: [
    {
      "inputs": [
        { "internalType": "address", "name": "owner", "type": "address" }
      ],
      "name": "balanceOf",
      "outputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "user", "type": "address" },
        { "internalType": "uint256", "name": "tier", "type": "uint256" }
      ],
      "name": "tierMint",
      "outputs": [
        { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "_tier", "type": "uint256" },
        { "internalType": "address", "name": "_to", "type": "address" }
      ],
      "name": "mint",
      "outputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "tier", "type": "uint256" }
      ],
      "name": "tierMintFee",
      "outputs": [
        { "internalType": "uint256", "name": "mintFee", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};
