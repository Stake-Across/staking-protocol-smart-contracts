// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "./base/StakeAcrossProtocol.sol";
import "./base/Vault.sol";

/// @title StakeAcrossVaultProtocol
/// @notice This contract is a StakeAcrossProtocol and a Vault
/// @dev This contract inherits from StakeAcrossProtocol and Vault

contract StakeAcrossVaultProtocol is StakeAcrossProtocol, Vault {
  /// @dev Initializes the StakeAcrossVaultProtocol contract
  /// @param _router  the  CCIP router address
  /// @param _link the address of the LINK token
  /// @param _asset  the token that is deposited into the vault
  /// @param _basisPoints  the fee that is taken on deposit
  constructor(
    address _router,
    address _link,
    IERC20 _asset,
    uint256 _basisPoints
  ) StakeAcrossProtocol(_router, _link) Vault(_asset, _basisPoints) {
    // Additional initializations if necessary
  }

  /// @dev The function receives the message from the CCIP router and executes the deposit logic. Override _ccipReceive() from StakeAcrossProtocol
  /// @param any2EvmMessage  the message received from the CCIP router
  function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage) internal override {
    // First, execute the original logic from StakeAcrossProtocol's _ccipReceive()
    bytes32 messageId = any2EvmMessage.messageId; // fetch the messageId
    uint64 sourceChainSelector = any2EvmMessage.sourceChainSelector; // fetch the source chain identifier (aka selector)
    address sender = abi.decode(any2EvmMessage.sender, (address)); // abi-decoding of the sender address
    address depositor = abi.decode(any2EvmMessage.data, (address)); // abi-decoding of the depositor's address

    // Collect tokens transferred. This increases this contract's balance for that Token.
    Client.EVMTokenAmount[] memory tokenAmounts = any2EvmMessage.destTokenAmounts;
    address token = tokenAmounts[0].token;
    uint256 amount = tokenAmounts[0].amount;

    receivedMessages.push(messageId);
    MessageIn memory detail = MessageIn(sourceChainSelector, sender, depositor, token, amount);
    messageDetail[messageId] = detail;

    emit MessageReceived(messageId, sourceChainSelector, sender, depositor, tokenAmounts[0]);

    // TODO: remove saving two times the same data on protocol and vault
    // Store depositor data.
    deposits[depositor][token] += amount;

    // Then, execute the deposit logic from Vault contract (deposit(receivedAmount, receiver) function)
    // The function calculates and sends an equivalent amount of shares based on the deposited assets
    deposit(amount, depositor);
  }

  /// @dev The function calculates and returns the equivalent amount of assets based on the burned shares.
  /// @param shares  the amount of shares to be burned
  /// @param destinationChain  the chain where the assets will be sent
  /// @param receiver  the address that will receive the assets
  function ccipRedeem(uint256 shares, uint64 destinationChain, address receiver) public {
    require(shares <= maxRedeem(_msgSender()), "ERC4626: redeem more than max");
    uint256 assets = previewRedeem(shares);
    beforeWithdraw(assets, shares);

    _burn(_msgSender(), shares);

    // transfer assets back to the user in the sender chain (Fuji)
    sendMessage(destinationChain, receiver, asset(), assets);

    emit Withdraw(_msgSender(), receiver, _msgSender(), assets, shares);
    // return assets;
  }
}
