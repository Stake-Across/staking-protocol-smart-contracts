const { networks } = require("../networks")

// usage example:
// npx hardhat redeem-protocol \
// --network sepolia \
// --address 0x6A10e6519a209482C8456C56768E7eA2fF0E19a1 \
// --dest-chain fuji \
// --amount 50

task("redeem-protocol", "redeem shares from protocol contract")
  .addParam("address", "address of CCIP Protocol contract to redeem from")
  .addParam("destChain", "destination chain as specified in networks.js file")
  .addParam("amount", "amount of shares to redeem in wei")
  .setAction(async (taskArgs, hre) => {
    if (network.name != "fuji" && network.name != "sepolia") {
      throw Error("This command is intended to be used with either Fuji or Sepolia.")
    }

    let { address, destChain, amount } = taskArgs
    let destChainSelector = networks[destChain].chainSelector

    let bnmTokenAddress = networks[network.name].bnmToken
    if (!bnmTokenAddress) {
      throw Error("Missing BnM Token Address from networks.js file")
    }

    const protocolFactory = await ethers.getContractFactory("StakeAcrossVaultProtocol")
    const protocolContract = await protocolFactory.attach(address)

    const assetFromProtocol = await protocolContract.asset()
    console.log(`\nAsset from Protocol: ${assetFromProtocol}`)
    console.log(`\nBnM Token Address:   ${bnmTokenAddress}`)
    if (assetFromProtocol !== bnmTokenAddress) {
      throw Error(`Asset from Protocol '${assetFromProtocol}' does not match BnM Token Address '${bnmTokenAddress}'`)
    }

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

    // redeem shares
    console.log(`\nRedeeming ${ethers.utils.formatEther(amount.toString())} ${symbol} from vault`)
    // function ccipRedeem(uint256 shares, uint64 destinationChain, address receiver) public {
    // log function call parameters
    console.log(`\nParameters:
    amount: ${amount}
    destChainSelector: ${destChainSelector}
    deployer.address: ${deployer.address}`)

    try {
      const redeemTx = await protocolContract.ccipRedeem(amount, destChainSelector, deployer.getAddress())
      // const redeemTx = await protocolContract.ccipRedeemHC(amount, '0x1487f4304C8663683BEEf72B32bc8845F5Fb8941')
      await redeemTx.wait()
      console.log(`Redeem Tx: ${redeemTx.hash}`)
    } catch (error) {
      console.log(`Error: ${error}`)
    }

    // read vault balances
    const vaultTotalAssetsAfter = await protocolContract.totalAssets()
    const vaultTotalSupplyAfter = await protocolContract.totalSupply()
    console.log(`\nVault Total Assets after redeem: ${ethers.utils.formatEther(vaultTotalAssetsAfter.toString())}`)
    console.log(`\nVault Total Supply after redeem: ${ethers.utils.formatEther(vaultTotalSupplyAfter.toString())}`)

    // read user balances
    const userBalanceAfter = await protocolContract.balanceOf(deployer.address)
    console.log(`\nUser ${symbol} Balance after redeem: ${ethers.utils.formatEther(userBalanceAfter.toString())}`)
  })
