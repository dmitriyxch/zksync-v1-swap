async function getZkSyncProvider (zksync, networkName) {
    let zkSyncProvider;
    try {
        zkSyncProvider = await zksync.getDefaultProvider(networkName);
    } catch (error) {
        console.log('Unable to connect to zkSync.');
        console.log(error);
    }
    return zkSyncProvider
}

async function getEthereumProvider (ethers, networkName) {
    let ethersProvider;
    try {
      // eslint-disable-next-line new-cap
      ethersProvider = new ethers.getDefaultProvider(networkName);
    } catch (error) {
      console.log('Could not connect to Rinkeby');
      console.log(error);
    }
    return ethersProvider
}

async function initAccount(rinkebyWallet, zkSyncProvider, zksync) {
    const zkSyncWallet = await zksync.Wallet.fromEthSigner(rinkebyWallet, zkSyncProvider);
    return zkSyncWallet
}

async function registerAccount (wallet) {
    console.log(`Registering the ${wallet.address()} account on zkSync`)
    if (!await wallet.isSigningKeySet()) {
        if (await wallet.getAccountId() === undefined) {
            throw new Error('Unknown account')
        }
        const changePubkey = await wallet.setSigningKey({
            feeToken: 'ETH',
            ethAuthType: 'ECDSA',
            //nonce: 0
        });
        const receipt = await changePubkey.awaitReceipt();
        console.log(receipt)
    } else {
        console.log('Already registered:'+wallet.address());
    }
}

async function depositToZkSync (zkSyncWallet, token, amountToDeposit, tokenSet) {
    const deposit = await zkSyncWallet.depositToSyncFromEthereum({
        depositTo: zkSyncWallet.address(),
        token: token,
        amount: tokenSet.parseToken(token, amountToDeposit.toString())
    });
    try {
        await deposit.awaitReceipt();
    } catch (error) {
        console.log('Error while awaiting confirmation from the zkSync operators.');
        console.log(error);
    }
}

async function transfer (from, toAddress, amountToTransfer, transferFee, token, zksync, tokenSet) {
    const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(tokenSet.parseToken(token, amountToTransfer.toString())); // transfer amount should be packable to 5-byte long floating-point representations in zkSync
    const closestPackableFee = zksync.utils.closestPackableTransactionFee(tokenSet.parseToken(token, transferFee)); // fees paid should be packable to 2-byte long floating-point representations in zkSync
    const transfer = await from.syncTransfer({
        to: toAddress,
        token: token,
        amount: closestPackableAmount,
        fee: closestPackableFee
    });
    const transferReceipt = await transfer.awaitReceipt();
    console.log('Got transfer receipt.');
    console.log(transferReceipt);
}

/* 
Return object of zkSyncProvider.getTransactionFee(transactionType, address, token):

export interface Fee {
    // Operation type (amount of chunks in operation differs and impacts the total fee).
    feeType: "Withdraw" | "Transfer" | "TransferToNew",
    // Amount of gas used by transaction
    gasTxAmount: utils.BigNumber,
    // Gas price (in wei)
    gasPriceWei: utils.BigNumber,
    // Ethereum gas part of fee (in wei)
    gasFee: utils.BigNumber,
    // Zero-knowledge proof part of fee (in wei)
    zkpFee: utils.BigNumber,
    // Total fee amount (in wei)
    // This value represents the summarized fee components, and it should be used as a fee
    // for the actual operation.
    totalFee: utils.BigNumber,
}
*/

async function getFee(transactionType, address, token, zkSyncProvider, tokenSet) {
    const fee = await zkSyncProvider.getTransactionFee(transactionType, address, token);
    return tokenSet.formatToken(token, fee.totalFee)
}

async function withdrawToEthereum (wallet, amountToWithdraw, withdrawalFee, token, zksync, tokenSet) {
    const closestPackableAmount = zksync.utils.closestPackableTransactionAmount(tokenSet.parseToken(token, amountToWithdraw.toString()));
    const closestPackableFee = zksync.utils.closestPackableTransactionFee(tokenSet.parseToken(token, withdrawalFee));
    const withdraw = await wallet.withdrawFromSyncToEthereum({
        ethAddress: wallet.address(),
        token: token,
        amount: closestPackableAmount,
        fee: closestPackableFee
    });
    await withdraw.awaitVerifyReceipt();
  
    console.log('ZKP verification is complete');
}

/* 
Return object of wallet.getAccountState():

{ address: '0xc26f2adeeebbad73f25329ffa12cd3889429b5b6',
  committed:
   { balances: { ETH: '99891300000000000', USDT: '241896200' },
     nonce: 5,
     pubKeyHash: 'sync:de9de11bdad08aa1cdc2beb5b2b7c7f29c10f079' },
  depositing: { balances: {} },
  id: 83,
  verified:
   { balances: { ETH: '99891300000000000', USDT: '235896200' },
     nonce: 5,
     pubKeyHash: 'sync:de9de11bdad08aa1cdc2beb5b2b7c7f29c10f079' }
}
*/

async function displayZkSyncBalance (wallet, tokenSet) {
    const state = await wallet.getAccountState()
  
    const committedBalances = state.committed.balances
    const verifiedBalances = state.verified.balances

    for (const property in committedBalances) {
        console.log(`Committed ${property} balance for ${wallet.address()}: ${tokenSet.formatToken(property, committedBalances[property])}`)
    }
    for (const property in verifiedBalances) {
        console.log(`Verified ${property} balance for ${wallet.address()}: ${tokenSet.formatToken(property, verifiedBalances[property])}`)
    }
}

async function getTokenBalance (wallet, token) {
    const state = await wallet.getAccountState()
    const verifiedBalances = state.verified.balances
    return verifiedBalances[token]
}

module.exports = {
    getZkSyncProvider,
    getEthereumProvider,
    depositToZkSync,
    registerAccount,
    displayZkSyncBalance,
    transfer,
    withdrawToEthereum,
    getTokenBalance,
    getFee,
    initAccount
}