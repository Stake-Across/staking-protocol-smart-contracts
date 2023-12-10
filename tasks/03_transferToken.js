const { networks } = require("../networks")

// usage example:
// npx hardhat transfer-token \
// --network fuji \
// --sender 0x41b8eEDC8902bd94Cdb5106d93d2E946c4F26C28 \
// --protocol 0x2D9d8110bd4404E9Ea53ECE368baf489E421c093 \
// --dest-chain sepolia \
// --amount 150

task("transfer-token", "transfers token x-chain from Sender.sol to Protocol.sol")
  .addParam("sender", "address of Sender.sol")
  .addParam("protocol", "address of Protocol.sol")
  .addParam("destChain", "destination chain as specified in networks.js file")
  .addParam("amount", "token amount to transfer in expressed in smallest denomination (eg juels, wei)")
  .setAction(async (taskArgs, hre) => {
    if (network.name === "hardhat") {
      throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
    }

    if (network.name !== "fuji") {
      throw Error("This task is intended to be executed on the Fuji network.")
    }

    let bnmTokenAddress = networks[network.name].bnmToken
    if (!bnmTokenAddress) {
      throw Error("Missing BnM Token Address from networks.js file")
    }

    let { sender, protocol, destChain, amount } = taskArgs

    let destChainSelector = networks[destChain].chainSelector

    const senderFactory = await ethers.getContractFactory("StakeAcrossSender")
    const senderContract = await senderFactory.attach(sender)

    try {
      const sendTokensTx = await senderContract.sendMessage(destChainSelector, protocol, bnmTokenAddress, amount)
      await sendTokensTx.wait()
      console.log("\nTx hash is ", sendTokensTx.hash)
      console.log(`\nPlease visit the CCIP Explorer at 'https://ccip.chain.link' and paste in the Tx Hash '${sendTokensTx.hash}' to view the status of your CCIP tx.
    Be sure to make a note of your Message Id for use in the next steps.`)
    } catch (error) {
      console.log(error)
    }
  })
