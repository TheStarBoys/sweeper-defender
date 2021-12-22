// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

// TODO: to improve security by adding Pausable and ReentrancyGuard
contract SweeperDefender is Ownable, ERC2771Context {
  using SafeMath for uint256;

  // user -> erc20 -> amount
  mapping (address => mapping(address => uint256)) funds;
  uint256 public feesPercentage = 1;

  event EtherSended(address indexed from, address indexed to, uint256 amount);
  event Funding(address indexed erc20, address indexed from, address indexed to, uint256 amount);
  event FeeUpdated(uint256 percentage);

  // Flow:
  // 1. Private wallet sends ethers to public wallet.
  // 2. Public wallet approves this contract to transfer tokens.
  // 3. Public wallet sends 10% funds to developer.
  // 4. Public wallet do transfer on ERC20 to private wallet.

  // Public wallet sends transaction once actually, because private wallet can
  // do next steps by public wallet signing the metatx.

  constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

  function sendEther(address recipient) public payable {
    payable(address(recipient)).transfer(msg.value);
    emit EtherSended(_msgSender(), recipient, msg.value);
  }

  function fundingAndTransfer(address erc20Addr, address recipient) public {
    ERC20 erc20 = ERC20(erc20Addr);
    uint256 erc20Bal = erc20.balanceOf(_msgSender());
    require(erc20Bal > 0, "SweeperDefender: no any erc20 balance");
    require(erc20.allowance(_msgSender(), address(this)) >= erc20Bal, "SweeperDefender: erc20 allowance not enough");

    uint256 fees;
    uint256 amount = erc20Bal;
    if (feesPercentage != 0) {
      fees = erc20Bal.mul(feesPercentage).div(100);
      amount = erc20Bal.sub(fees);
    }

    funding(erc20Addr, fees);
    transferERC20(erc20Addr, recipient, amount);
  }

  function funding(address erc20Addr, uint256 fees) private {
    if (fees != 0) {
      bool succ = ERC20(erc20Addr).transferFrom(_msgSender(), owner(), fees);
      require(succ, "SweeperDefender: transfer fees failed");
      funds[_msgSender()][erc20Addr] = funds[_msgSender()][erc20Addr].add(fees);
    }
    
    emit Funding(erc20Addr, _msgSender(), owner(), fees);
  }

  function transferERC20(address erc20Addr, address recipient, uint256 amount) private {
    ERC20 erc20 = ERC20(erc20Addr);
    bool succ = erc20.transferFrom(_msgSender(), recipient, amount);
    require(succ, "SweeperDefender: transfer balance failed");
  }

  function isApprove(address erc20Addr, address owner) public view returns(bool) {
    ERC20 erc20 = ERC20(erc20Addr);
    uint256 erc20Bal = erc20.balanceOf(owner);
    require(erc20Bal > 0, "SweeperDefender: no any erc20 balance");
    
    return erc20.allowance(owner, address(this)) >= erc20Bal;
  }

  function setFees(uint256 percentage) public {
    require(percentage < 100, "SweeperDefender: percentage is invalid");
    feesPercentage = percentage;
    emit FeeUpdated(percentage);
  }

  function _msgSender() internal view virtual override(Context, ERC2771Context) returns (address) {
    return ERC2771Context._msgSender();
  }

  function _msgData() internal view virtual override(Context, ERC2771Context) returns (bytes calldata) {
    return ERC2771Context._msgData();
  }
}