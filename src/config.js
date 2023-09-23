const dotenv = require("dotenv");

dotenv.config();
const abi = require("./abi/abi.json")
const RPC = process.env.RPC;
const privateKey = process.env.PRIVATE_KEY;
const address = process.env.CONTRACT_ADDRESS;

module.exports = {RPC,privateKey,address,abi};