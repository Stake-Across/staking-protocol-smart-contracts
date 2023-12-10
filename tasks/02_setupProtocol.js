const { networks } = require("../networks")

// usage example: npx hardhat setup-protocol --network sepolia

task("setup-protocol", "deploy StakeAcrossVaultProtocol.sol").setAction(async (taskArgs, hre) => {
  if (network.name === "hardhat") {
    throw Error("This command cannot be used on a local development chain.  Specify a valid network.")
  }

  if (network.name !== "sepolia") {
    throw Error("This task is intended to be executed on the Sepolia network.")
  }

  const bnmToken = networks[network.name].bnmToken
  if (!bnmToken) {
    throw Error("Missing BNM Token Address")
  }

  const ROUTER = networks[network.name].router
  const LINK = networks[network.name].linkToken
  const LINK_AMOUNT = "0.5"
  const VAULT_ASSET = bnmToken
  const VAULT_BASIS_POINTS = "100"

  console.log("\n__Compiling Contracts__")
  await run("compile")

  // Deploy the StakeAcrossVaultProtocol contract
  console.log(`\nDeploying StakeAcrossVaultProtocol.sol to ${network.name}...`)

  const protocolFactory = await ethers.getContractFactory("StakeAcrossVaultProtocol")
  // const protocolFactory = await ethers.getContractFactory("StakeAcrossProtocol")

  const protocolContract = await protocolFactory.deploy(ROUTER, LINK, VAULT_ASSET, VAULT_BASIS_POINTS)
  // const protocolContract = await protocolFactory.deploy(ROUTER, LINK)
  await protocolContract.deployTransaction.wait(1)

  console.log(`\nProtocol contract is deployed to ${network.name} at ${protocolContract.address}`)

  const [deployer] = await ethers.getSigners()

  // Fund with LINK
  console.log(`\nFunding ${protocolContract.address} with ${LINK_AMOUNT} LINK `)
  const linkTokenContract = await ethers.getContractAt("LinkTokenInterface", networks[network.name].linkToken)

  // Transfer LINK tokens to the Protocol contract
  const linkTx = await linkTokenContract.transfer(protocolContract.address, ethers.utils.parseEther(LINK_AMOUNT))
  await linkTx.wait(1)

  const juelsBalance = await linkTokenContract.balanceOf(protocolContract.address)
  const linkBalance = ethers.utils.formatEther(juelsBalance.toString())
  console.log(`\nFunded ${protocolContract.address} with ${linkBalance} LINK`)

  // Fund with ETH
  console.log(`\nFunding ${protocolContract.address} with 0.5 ETH `)
  const ethTx = await deployer.sendTransaction({
    to: protocolContract.address,
    value: ethers.utils.parseEther("0.5"),
  })
  await ethTx.wait(1)

  const ethBalance = await ethers.provider.getBalance(protocolContract.address)
  console.log(`\nFunded ${protocolContract.address} with ${ethers.utils.formatEther(ethBalance.toString())} ETH`)

  // read vault properties
  const vaultTotalAssets = await protocolContract.totalAssets()
  const vaultTotalSupply = await protocolContract.totalSupply()
  console.log(`\nVault Total Assets: ${ethers.utils.formatEther(vaultTotalAssets.toString())}`)
  console.log(`\nVault Total Supply: ${ethers.utils.formatEther(vaultTotalSupply.toString())}`)

  // Get the MockUSDC Contract address.
  const usdcToken = await protocolContract.usdcToken()
  console.log(`\nMockUSDC contract is deployed to ${network.name} at ${usdcToken}`)
})
