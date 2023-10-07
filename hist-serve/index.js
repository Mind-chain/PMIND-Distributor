const express = require('express');
const fs = require('fs');
const ethers = require('ethers');
const chokidar = require('chokidar');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = 3000;
const jsonFilePath = '../txn.json';

const convertWeiToEth = (wei) => {
  return ethers.utils.formatEther(wei);
};

const updateData = () => {
  try {
    const historyData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    for (const entry of historyData) {
      entry.gasPriceMIND = convertWeiToEth(entry.gasPrice);
      entry.gasCostMIND = convertWeiToEth(entry.gasCost);
      entry.walletBalanceMIND = convertWeiToEth(entry.walletBalance);
      entry.tokenBalancePMIND = convertWeiToEth(entry.tokenBalance);
      delete entry.gasPrice;
      delete entry.gasCost;
      delete entry.walletBalance;
      delete entry.tokenBalance;
    }

    app.locals.historyData = historyData;

    io.emit('data-updated', historyData);
  } catch (error) {
    console.error('Error reading JSON file:', error);
  }
};

updateData();

app.get('/history', (req, res) => {
  res.json(app.locals.historyData); // Return the entire historyData array
});


const watcher = chokidar.watch(jsonFilePath);
watcher.on('change', () => {
  updateData();
});

io.on('connection', (socket) => {
  socket.emit('data-updated', app.locals.historyData);
  socket.on('disconnect', () => {});
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
