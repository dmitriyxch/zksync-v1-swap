
const ethers = require('ethers')
const zksync = require('zksync')
const utils = require('./utils')
const dotenv = require("dotenv");
const { exit } = require('process');
const yargs = require('yargs/yargs')
const fs = require('fs')
const { hideBin } = require('yargs/helpers')

const argv = yargs(hideBin(process.argv)).argv
dotenv.config();

async function swaps(wallet_key, token, amountToDeposit, amountToWithdraw) {
    const zkSyncProvider = await zksync.getDefaultProvider(process.env.NETWORK_NAME);
    const ethersProvider = await ethers.getDefaultProvider(process.env.NETWORK_NAME, { infura: process.env.INFURA_PROJECT_ID });
    console.log('Start swaps ZKsync V1')

    const currentWallet = new ethers.Wallet(wallet_key, ethersProvider) // Account #78
    console.log(`load address: ${currentWallet.address}`)

    console.log('Creating a zkSync wallet')
    const zkSyncWallet = await utils.initAccount(currentWallet, zkSyncProvider, zksync)

    const tokenSet = zkSyncProvider.tokenSet;

  
    
    const initialBalance = await zkSyncWallet.getEthereumBalance(token)
    console.log(`initial balance is: ${tokenSet.formatToken(token, initialBalance)}`)

    if (token != 'ETH') {
        await zkSyncWallet.approveERC20TokenDeposits(token)
    }

    if (parseFloat(amountToDeposit) > 0) {
        console.log('Depositing: ' + amountToDeposit);
        await utils.depositToZkSync(zkSyncWallet, token, amountToDeposit, tokenSet);
    }
    await utils.displayZkSyncBalance(zkSyncWallet, tokenSet)
    await utils.registerAccount(zkSyncWallet)

    /*let CIDhash = multiformats.CID.parse("QmQhkT5iJKTXukxaKC9UhBYQue9paX9YU3XbGyGQo4yBQV");

    let cid = CIDhash.toV1().toString(multiformats.base16.encoder);
    let cidLength = cid.length;
    //console.log(cidLength);
    let contentHash = cid.slice(cidLength-64, cidLength+1);
    contentHash = '0x' + contentHash;*/
    //contentHash = '0xe9f912a08ca18dd4d34460c455d714372ae1181a379c8d66f41ef4ea86c5d4f7';
    contentHashes = []
    contentHashes.push('0x5b611d1d2e5d5031e0783327097e051eda1386929316b95eff9154c4255b93fe'); //tavera 
    contentHashes.push('0x22ef4787c545096e9295b575ebabbb736a1cbe83bfa879f6ac0c4cf2f831575c');
    //console.log(contentHash);

    const start = new Date().getTime();

    console.log("Start minting");
    var i = 0;
    for (i = 0; i < contentHashes.length; i++) {
        console.log(contentHashes[i])
        const testNFT_tm = await zkSyncWallet.mintNFT({
            recipient: currentWallet.address,
            contentHash: contentHashes[i],
            feeToken: "ETH"
        });
        const receipt = await testNFT_tm.awaitReceipt();
        console.log("Created NFT id: ", i);
    }

    let elapsed = new Date().getTime() - start;

    // Get state of account
    const state = await zkSyncWallet.getAccountState();
    // View committed NFTs
    console.log('committed NFTs: ' + Object.keys(state.committed.nfts).length);
    // View verified NFTs
    console.log('verified NFTs: ' + Object.keys(state.verified.nfts).length);

    console.log("Total minting time", elapsed/1000);

    //console.log('Transferring')
    // Bob's address is stored in an environment variable. Before you run the bob.js script, you'll have set it as follows: `export BOB_ADDRESS=<BOB_ACTUAL_ADDRESS>
    //const transferFee = await utils.getFee('Transfer', aliceRinkebyWallet.address, token, zkSyncProvider, tokenSet)
    //await utils.transfer(zkSyncWallet, process.env.BOB_ADDRESS, amountToTransfer, transferFee, token, zksync, tokenSet)
    const withdrawalFee = await utils.getFee('Withdraw', currentWallet.address, token, zkSyncProvider, tokenSet)
    if (parseFloat(amountToWithdraw) > 0) {
        console.log('Withdrawing: ' + amountToWithdraw);
        utils.withdrawToEthereum(zkSyncWallet, amountToWithdraw, withdrawalFee, token, zksync, tokenSet);
    } else if (amountToWithdraw == 'all') {
        let allBalance = await utils.getTokenBalance(zkSyncWallet,token);
        console.log(allBalance)
        if (token == 'ETH') {
            allBalance = allBalance - withdrawalFee;
        }
        console.log('Withdrawing: ' + allBalance);
        utils.withdrawToEthereum(zkSyncWallet, allBalance, withdrawalFee, token, zksync, tokenSet)
    }
}


async function start() {

    const token = argv.token; // 'ETH'
    const amountToDeposit = argv.deposit; //'0.001'
    const amountToWithdraw = argv.withdraw; //'0.001'
    const finished_wallets = fs.readFileSync('finished.txt', 'utf8').toString().split("\n");
    const wallets = fs.readFileSync('wallets.txt', 'utf8').toString().split("\n");
    let ref_cnt = 0;
    for (const [index, wal] of wallets.entries()) {
        if (wal.length > 0) {
            const wallet_address = wal.split(":")[0];
            const wallet_key = wal.split(":")[1];
            if (!finished_wallets.includes(wallet_address.toLowerCase()) && !finished_wallets.includes(wallet_address)) {
                try {
                    await swaps(wallet_key, token, amountToDeposit, amountToWithdraw);
                    fs.appendFileSync('finished.txt', wallet_address + '\n', "utf8");
                }
                catch (e) {
                    console.log(e)
                }

            }
            console.log('finished accounts: ' + index)
        }

    }
}

start();
