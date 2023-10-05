const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { abi, address, privateKey, RPC } = require('./config');

const provider = new ethers.providers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(address, abi, wallet);
const tokenContract = new ethers.Contract(address, abi, provider);

const transactionHistory = [];

const txnFilePath = path.join(__dirname, 'txn.json');

async function distributeRewards() {
    try {
        console.log('Starting reward distribution...');

        const gasPrice = await provider.getGasPrice();
        const gasLimit = 200000;

        const gasCost = gasPrice.mul(gasLimit);

        const walletBalance = await wallet.getBalance();
        const tokenBalance = await tokenContract.balanceOf(address);

        console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'ether')}`);
        console.log(`Gas limit: ${gasLimit}`);
        console.log(`Gas cost: ${ethers.utils.formatEther(gasCost)} MIND`);
        console.log(`Wallet balance: ${ethers.utils.formatEther(walletBalance)} MIND`);
        console.log(`Token balance of contract: ${ethers.utils.formatUnits(tokenBalance, 'ether')} PMIND`);

        if (walletBalance.gte(gasCost)) {
            const nonce = await wallet.getTransactionCount();

            const tx = {
                nonce: nonce,
                to: address,
                gasPrice: gasPrice,
                gasLimit: gasLimit,
                value: ethers.utils.parseEther('0'),
                data: contract.interface.encodeFunctionData('distributeRewards')
            };

            console.log('Sending transaction...');

            const signedTx = await wallet.signTransaction(tx);

            // Send the transaction
            const txResponse = await provider.sendTransaction(signedTx);

            console.log(`Transaction hash: ${txResponse.hash}`);
            console.log('Transaction sent successfully.');

            transactionHistory.push({
                timestamp: new Date().toISOString(),
                transactionHash: txResponse.hash,
                gasPrice: gasPrice.toString(),
                gasLimit: gasLimit,
                gasCost: gasCost.toString(),
                walletBalance: walletBalance.toString(),
                tokenBalance: tokenBalance.toString(),
            });

            fs.writeFileSync(txnFilePath, JSON.stringify(transactionHistory, null, 2));

            // Start the countdown again after successfully sending the transaction
            startCountdown();
        } else {
            console.log('Insufficient wallet balance for gas cost.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function startCountdown() {
    console.log('Transaction completed. Starting countdown for the next transaction...');
    let countdownSeconds = 24 * 60 * 60; // 24 hours in seconds

    const countdownInterval = setInterval(() => {
        const hours = Math.floor(countdownSeconds / 3600);
        const minutes = Math.floor((countdownSeconds % 3600) / 60);
        const seconds = countdownSeconds % 60;

        process.stdout.write(`Next transaction in: ${hours} hours, ${minutes} minutes, ${seconds} seconds\r`);

        if (countdownSeconds <= 0) {
            clearInterval(countdownInterval);
            // Move the distributeRewards() call outside of this block
            logTimeUntilNextTransaction();
            distributeRewards();
        }

        countdownSeconds--;
    }, 1000);
}

function logTimeUntilNextTransaction() {
    const now = new Date();
    const nextTransactionTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeUntilNextTransaction = Math.ceil((nextTransactionTime - now) / 1000);
    const hoursUntilNextTransaction = Math.floor(timeUntilNextTransaction / 3600);
    const minutesUntilNextTransaction = Math.floor((timeUntilNextTransaction % 3600) / 60);
    const secondsUntilNextTransaction = timeUntilNextTransaction % 60;

    console.log(`Next transaction in: ${hoursUntilNextTransaction} hours, ${minutesUntilNextTransaction} minutes, ${secondsUntilNextTransaction} seconds`);
}

// Call distributeRewards initially
distributeRewards();
logTimeUntilNextTransaction();

// Call distributeRewards every 24 hours and log the time until the next transaction
setInterval(() => {
    distributeRewards();
    logTimeUntilNextTransaction();
}, 24 * 60 * 60 * 1000);
