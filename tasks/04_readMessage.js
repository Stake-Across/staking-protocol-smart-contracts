
// usage example:
// npx hardhat read-message \
// --network fuji \
// --address 0x224551537eD9fE2D92a0C34004faE603209aA526  \
// --contract Sender \
// --message-id 0x73785426db8a382cac311612a33c5125b45294f737b080432d92eec8cad8d108

task("read-message", "reads CCIP message on dest contract")
  .addParam("address", "address of CCIP contract to read")
  .addParam("contract", "Name of the CCIP contract to read")
  .addParam("messageId", "messageId to retrieve from the contract")
  .setAction(async (taskArgs, hre) => {
    if (network.name != "fuji" && network.name != "sepolia") {
      throw Error("This command is intended to be used with either Fuji or Sepolia.")
    }

    let { address, contract, messageId } = taskArgs

    let ccipContractFactory
    if (contract === "Protocol") {
      ccipContractFactory = await ethers.getContractFactory("StakeAcrossVaultProtocol")
    } else if (contract === "Sender") {
      ccipContractFactory = await ethers.getContractFactory("StakeAcrossSender")
    } else {
      throw Error(`Contract ${contract} not valid. Must be "Protocol" or "Sender"`)
    }

    const ccipContract = await ccipContractFactory.attach(address)

    const [sourceChainSelector, senderContract, depositorEOA, transferredToken, amountTransferred] =
      await ccipContract.messageDetail(messageId)

    console.log(`\nmessage details received in ${contract} on ${network.name}: 
    messageId: ${messageId},
    sourceChainSelector: ${sourceChainSelector},
    senderContract: ${senderContract},
    depositorEOA: ${depositorEOA},
    transferredToken: ${transferredToken},
    amountTransferred: ${amountTransferred}
    `)

    // Checking state on Protocol.sol
    if (contract === "Protocol") {
      const deposit = await ccipContract.deposits(depositorEOA, transferredToken)

      const borrowedToken = await ccipContract.usdcToken()
      const borrowings = await ccipContract.borrowings(depositorEOA, borrowedToken)

      console.log(`Deposit recorded on Protocol: 
    Depositor: ${depositorEOA}, 
    Token: ${transferredToken}, 
    Deposited Amount: ${deposit},
    Borrowing: ${borrowings}
    `)
      // read vault properties
      const vaultTotalAssets = await ccipContract.totalAssets()
      const vaultTotalSupply = await ccipContract.totalSupply()
      console.log(`\nVault Total Assets: ${ethers.utils.formatEther(vaultTotalAssets.toString())}`)
      console.log(`\nVault Total Supply: ${ethers.utils.formatEther(vaultTotalSupply.toString())}`)
    }
  })
