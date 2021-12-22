const { assert } = require("chai")
const { web3, BN } = require("@openzeppelin/test-helpers/src/setup");
const Wallet = require('ethereumjs-wallet').default;
const {
  toBuffer,
  keccak256,
} = require("ethereumjs-util");

const {
    expectRevert,
    time
} = require('@openzeppelin/test-helpers')
const {
  toWei,
  fromWei
} = web3.utils

const testUtils = require('./utils');
const { toBN } = require("web3-utils");

const MetaTx = artifacts.require('MetaTx')
const SweeperDefender = artifacts.require('SweeperDefender')
const USDTMock = artifacts.require('USDTMock')

// const publicWallet = Wallet.fromPrivateKey(toBuffer('0x665a4dba0eab0bda352d7d6c2b0ef9ac5fdb28f4ae0c9075f9d7fc10a049ab01'))
contract('SweeperDefender', ([public, private, dev, minter]) => {
  beforeEach(async() => {
    this.metatx = await MetaTx.new({ from: dev })
    this.erc20 = await USDTMock.new({ from: minter })
    this.defender = await SweeperDefender.new(this.metatx.address, { from: dev })
    await this.erc20.transfer(public, toWei('10000'), { from: minter })
    assert.equal((await this.erc20.balanceOf(public)).toString(), toWei('10000').toString())
  })

  it('setFees', async() => {
    await this.defender.setFees('20', { from: dev })

    await expectRevert(
      this.defender.setFees('100', { from: dev }),
      'SweeperDefender: percentage is invalid',
    )
  })

  it('sendEther', async() => {
    const beforeBal = await web3.eth.getBalance(public)
    const receipt = await this.defender.sendEther(public, { from: private, value: toWei('1') })
    const afterBal = await web3.eth.getBalance(public)
    assert.equal(afterBal, toBN(beforeBal).add(toBN(toWei('1'))))
    const etherSendedEvent = testUtils.getEventArgsFromTx(receipt, 'EtherSended')
    assert.equal(etherSendedEvent.from, private)
    assert.equal(etherSendedEvent.to, public)
    assert.equal(etherSendedEvent.amount, toWei('1'))
  })

  it('fundingAndTransfer', async() => {
    await this.defender.setFees('10', { from: dev })
    await this.erc20.approve(this.defender.address, await this.erc20.balanceOf(public), { from: public })
    const receipt = await this.defender.fundingAndTransfer(this.erc20.address, private, { from: public })
    assert.equal((await this.erc20.balanceOf(dev)).toString(), toWei('1000').toString())
    assert.equal((await this.erc20.balanceOf(public)).toString(), '0')
    assert.equal((await this.erc20.balanceOf(private)).toString(), toWei('9000').toString())

    const fundingEvent = testUtils.getEventArgsFromTx(receipt, 'Funding')
    assert.equal(fundingEvent.erc20, this.erc20.address)
    assert.equal(fundingEvent.from, public)
    assert.equal(fundingEvent.to, await this.defender.owner())
    assert.equal(fundingEvent.amount, toWei('1000'))
  })

  it('fundingAndTransfer without feesPercentage', async() => {
    await this.defender.setFees('0', { from: dev })
    await this.erc20.approve(this.defender.address, await this.erc20.balanceOf(public), { from: public })
    const receipt = await this.defender.fundingAndTransfer(this.erc20.address, private, { from: public })
    assert.equal((await this.erc20.balanceOf(dev)).toString(), toWei('0').toString())
    assert.equal((await this.erc20.balanceOf(public)).toString(), '0')
    assert.equal((await this.erc20.balanceOf(private)).toString(), toWei('10000').toString())

    const fundingEvent = testUtils.getEventArgsFromTx(receipt, 'Funding')
    assert.equal(fundingEvent.erc20, this.erc20.address)
    assert.equal(fundingEvent.from, public)
    assert.equal(fundingEvent.to, await this.defender.owner())
    assert.equal(fundingEvent.amount, toWei('0'))
  })

  it('multiple fundingAndTransfer', async() => {
    await this.defender.setFees('10', { from: dev })

    // First
    await this.erc20.approve(this.defender.address, await this.erc20.balanceOf(public), { from: public })
    await this.defender.fundingAndTransfer(this.erc20.address, private, { from: public })
    assert.equal((await this.erc20.balanceOf(dev)).toString(), toWei('1000').toString())
    assert.equal((await this.erc20.balanceOf(public)).toString(), '0')
    assert.equal((await this.erc20.balanceOf(private)).toString(), toWei('9000').toString())

    // Second
    await this.erc20.transfer(public, toWei('10000'), { from: minter })
    await this.erc20.approve(this.defender.address, await this.erc20.balanceOf(public), { from: public })
    await this.defender.fundingAndTransfer(this.erc20.address, private, { from: public })
    assert.equal((await this.erc20.balanceOf(dev)).toString(), toWei('2000').toString())
    assert.equal((await this.erc20.balanceOf(public)).toString(), '0')
    assert.equal((await this.erc20.balanceOf(private)).toString(), toWei('18000').toString())
  })
})