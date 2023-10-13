const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { abi, address, privateKey, RPC } = require('./config');

// Constants
const GAS_LIMIT = 200000;

let transactionSent = false; // Flag to track if a transaction has been sent

async function main() {
    try {
        // If a transaction has already been sent, do nothing and return
        if (transactionSent) {
            return;
        }

        // Initialize provider and wallet
        const provider = new ethers.providers.JsonRpcProvider(RPC);
        const wallet = new ethers.Wallet(privateKey, provider);
        const contract = new ethers.Contract(address, abi, wallet);

        console.log('Starting reward distribution...');

        // Get gas price
        const gasPrice = await provider.getGasPrice();

        // Estimate gas cost
        const estimatedGas = await contract.estimateGas.distributeRewards();
        const gasCost = estimatedGas.mul(gasPrice);

        const walletBalance = await wallet.getBalance();
        const tokenBalance = await contract.balanceOf(wallet.address);

        console.log(`Gas price: ${ethers.utils.formatUnits(gasPrice, 'ether')}`);
        console.log(`Gas limit: ${GAS_LIMIT}`);
        console.log(`Gas cost: ${ethers.utils.formatEther(gasCost)} MIND`);
        console.log(`Wallet balance: ${ethers.utils.formatEther(walletBalance)} MIND`);
        console.log(`Token balance of contract: ${ethers.utils.formatUnits(tokenBalance, 'ether')} PMIND`);

        if (walletBalance.gte(gasCost)) {
            const nonce = await wallet.getTransactionCount();

            const tx = {
                nonce: nonce,
                to: address,
                gasPrice: gasPrice,
                gasLimit: GAS_LIMIT,
                value: ethers.utils.parseEther('0'),
                data: contract.interface.encodeFunctionData('distributeRewards')
            };

            console.log('Sending transaction...');

            const txResponse = await wallet.sendTransaction(tx);

            console.log(`Transaction hash: ${txResponse.hash}`);
            console.log('Transaction sent successfully.');

            const transactionHistory = {
                timestamp: new Date().toISOString(),
                transactionHash: txResponse.hash,
                gasPrice: gasPrice.toString(),
                gasLimit: GAS_LIMIT,
                gasCost: gasCost.toString(),
                walletBalance: walletBalance.toString(),
                tokenBalance: tokenBalance.toString(),
            };

            fs.writeFileSync(path.join(__dirname, 'txn.json'), JSON.stringify(transactionHistory, null, 2));

            // Set the transactionSent flag to true
            transactionSent = true;

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
            logTimeUntilNextTransaction();

            // Reset the transactionSent flag for the next transaction
            transactionSent = false;

            // Call main() for the next transaction
            main();
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

// Call main initially
main();
logTimeUntilNextTransaction();

// Call main every 24 hours and log the time until the next transaction
setInterval(() => {
    main();
    logTimeUntilNextTransaction();
}, 24 * 60 * 60 * 1000);
