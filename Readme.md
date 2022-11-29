
Install 
`npm i`

wallets.txt - list of accounts, format public:private_key 

finished.txt - list of finished accounts

Run 
`node src/swap.js --token=ETH --deposit=0.01 --withdraw=0.01`

--token - token name ETH / USDT / USDC

--deposit - how many to deposit on zksync , 0 - skip depositing

--withdraw - how many to withdraw on mainnet, 0 - skip withdraw, all - withdraw all funds
