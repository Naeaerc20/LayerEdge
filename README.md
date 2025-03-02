# LayerEdge Auto Farming

LayerEdge specialized code for Daily Auto-Activation Node, Check-In, Mint Pass, Complete tasks & send proofs

## Project Formart

``` shell

LayerEdge/
├── README.md                  # Project documentation and overview
├── index.js                   # Main entry point
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Lock file for dependency versions
├── scripts/                   # Contains API-related scripts
│   └── apis.js                # Implements API functions and request handling
├── utils/                     # Utility scripts and data files
│   ├── wallet_generator.js    # Script for generating wallets
│   ├── wallet_aggregator.js   # Script for aggregating wallet information
│   ├── wallets.json           # Stores wallet data
│   └── proxies.txt            # Proxy configuration file
├── data/                      # Informational JSON files
│   ├── activated.json         # Tracks activated accounts
│   ├── registered.json        # Tracks registered accounts
│   └── proofs.json            # Stores proof records (address, proof, is_submitted, is_verified)
├── pledge_pass/               # Contains smart contract interaction files
│   ├── ABI.js                 # Exports RPC configuration, contract address, and contract ABI
│   └── mint.js                # Script for verifying NFT ownership and minting NFTs if needed
└── tasks.js                   # Implements automated tasks for completing NFT verification, proof submission, and node tasks.

```

## Instructions

``` shell

1. git clone https://github.com/Naeaerc20/LayerEdge
2. cd LayerEdge
3. Use any of following prompts to interact with the CLI

## Prompts

- npm start - runs main code application index.js
- npm run generate - runs wallet generator requesting amount of wallets to be created
- npm run aggregate - runs wallet aggreator asking you to insert privateKeys of the wallets you wish to add
- npm run mint - runs script dedicated for minting OG Pledge Pass & Free Pass
- npm run tasks - runs task.js script dedicated to auto complete tasks & claim points with error handle

## Notes

1. Now "proxies.txt" file is on "utils" so add your proxies using "nano utils/proxies.txt" - generate them via 2CAPTCHA
Proxy Format is: socks5://login:pass@ip:port

Good Luck Team!
