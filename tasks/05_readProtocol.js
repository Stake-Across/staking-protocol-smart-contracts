
// usage example:
// npx hardhat read-protocol \
// --network sepolia \
// --address 0x6A10e6519a209482C8456C56768E7eA2fF0E19a1

task("read-protocol", "reads protocol contract balances")
  .addParam("address", "address of CCIP contract to read")
  .setAction(async (taskArgs, hre) => {
    if (network.name != "fuji" && network.name != "sepolia") {
      throw Error("This command is intended to be used with either Fuji or Sepolia.")
    }

    let { address } = taskArgs

    const protocolFactory = await ethers.getContractFactory("StakeAcrossVaultProtocol")
    const protocolContract = await protocolFactory.attach(address)

    // read vault balances
    const vaultTotalAssets = await protocolContract.totalAssets()
    const vaultTotalSupply = await protocolContract.totalSupply()
    console.log(`\nVault Total Assets: ${ethers.utils.formatEther(vaultTotalAssets.toString())}`)
    console.log(`\nVault Total Supply: ${ethers.utils.formatEther(vaultTotalSupply.toString())}`)

    // read user balances
    const [deployer] = await ethers.getSigners()
    const userBalance = await protocolContract.balanceOf(deployer.address)
    const symbol = await protocolContract.symbol()
    console.log(`\nUser ${symbol} Balance: ${ethers.utils.formatEther(userBalance.toString())}`)

    // read vault preview redeem for user balance
    const assetsRedeem = await protocolContract.previewRedeem(userBalance)
    console.log(`\nVault Preview Redeem: ${ethers.utils.formatEther(assetsRedeem.toString())}`)

  })
