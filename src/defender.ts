import { FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle'
import { BaseProvider, TransactionReceipt, TransactionRequest, TransactionResponse } from '@ethersproject/providers'
import { BigNumber, ethers, Wallet } from 'ethers'
import Web3 from 'web3'
import { calculateCost, getFeedTx, sleep } from './utils'
import { Subscription } from 'web3-core-subscriptions'
import { ERC20, MinimalForwarder, SweeperDefender } from './contracts'
import { ForwardRequest, SignForwardRequest } from './metatx'

export class TxDefender {
  /*
  TxDefender
  1. 传入需要保护的交易，交易顺序即执行顺序
  2. TxDefender 去检测公共 txpool 是否有黑客抬高 gas price，如有有，提高 gas price 并重新广播交易
  3. gas price 的区间为 [0, (balance-value) / gas]
  */

  web3: Web3
  provider: BaseProvider
  txs: Array<FlashbotsBundleTransaction>
  txResponses: Array<TransactionResponse>
  txReceipts: Array<TransactionReceipt>
  curr: number // It reports which tx was mined.
  confirmations: number
  timeout: number
  getTxMaxCount: number
  getTxInterval: number
  totalValue: BigNumber
  totalGas: BigNumber
  pendingTxSub: Subscription<string>

  constructor(wsChainUrl: string, provider: BaseProvider, txs: Array<FlashbotsBundleTransaction>, confirmations = 2, timeout = 120000) {
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(wsChainUrl))
    this.provider = provider
    this.txs = txs
    this.txResponses = new Array()
    this.txReceipts = new Array()
    this.curr = 0
    this.confirmations = confirmations
    this.timeout = timeout
    this.getTxMaxCount = 12
    this.getTxInterval = 100

    this.totalValue = BigNumber.from(0)
    this.totalGas = BigNumber.from(0)
    for (let tx of txs) {
      if (tx.transaction.value) {
        this.totalValue = this.totalValue.add(tx.transaction.value)
      }

      if (tx.transaction.gasLimit) {
        this.totalGas = this.totalGas.add(tx.transaction.gasLimit)
      }
    }

    this.pendingTxSub = this.web3.eth.subscribe("pendingTransactions", (err, res) => {
      if (err) console.error(err)
    })

    for (let tx of txs) {
      console.log('defender protects tx ', tx.transaction)
    }
  }

  // TODO: Exception handle.
  async run() {
    this.pendingTxSub.on('data', async (txHash) => {
      for (let i = 0; i < this.getTxMaxCount; i++) {
        try {
          let txResponse = await this.provider.getTransaction(txHash)
          if (!txResponse) {
            await sleep(this.getTxInterval)
            continue
          }
          // console.log('incoming txHash: ', txResponse.hash)
          await this.onGetTxFromTxPool(txResponse)
          break
        } catch (err) {
          console.error(err);
        }
      }
    })

    while (this.curr < this.txs.length) {
      await this.sendTx()
      const succ = await this.waitForTransaction()
      if (!succ) {
        throw Error('wait for transaction time out')
      }
    }

    console.log('defender protects successfully!')

    return this.txReceipts
  }

  async close() {
    await this.pendingTxSub.unsubscribe()
  }

  private async onGetTxFromTxPool(incomingTx: TransactionResponse) {
    if (!await this.isHackerTx(incomingTx)) return
    console.log("It's hacker tx, try to replace: ", incomingTx)
    let index = await this.indexOfHackerTx(incomingTx)

    const nextGasPrice = BigNumber.from(incomingTx.gasPrice).mul(BigNumber.from(110)).div(BigNumber.from(100))
    this.txs[index].transaction.gasPrice = nextGasPrice
    // send again
    this.sendTx()
  }

  private async sendTx() {
    console.log('try send transaction, curr: ', this.curr)
    const bundleTx = this.txs[this.curr]
    let from = bundleTx.transaction.from
    if (!from) {
      from = await bundleTx.signer.getAddress()
    }
    // TODO: Fill up nonce before calling sendTx.
    bundleTx.transaction.nonce = await this.provider.getTransactionCount(from)
    const signedTx = await bundleTx.signer.signTransaction(bundleTx.transaction)
    const response = await this.provider.sendTransaction(signedTx)
    console.log('send transaction: ', response)

    if (this.curr >= this.txResponses.length) {
      console.log(`send transaction ${this.curr} first...`)
      this.txResponses = this.txResponses.concat(response)
    } else {
      console.log(`send transaction ${this.curr} to replace hacker tx...`)
      this.txResponses[this.curr] = response
    }

    console.log('send transaction after responses: ', this.txResponses)
  }

  private async waitForTransaction() {
    console.log('wait for transaction, curr: ', this.curr)
    let startTime = Date.now()
    while (Date.now() - startTime < this.timeout) {
      try {
        const txHash = this.txResponses[this.curr].hash
        console.log('wait fot txhash: ', txHash)
        if (!txHash) {
          sleep(100)
          continue
        }
        const receipt = await this.provider.getTransactionReceipt(txHash)

        if (!receipt) {
          sleep(100)
          continue
        }
        this.txReceipts = this.txReceipts.concat(receipt)
        this.curr++
        console.log(`wait for transaction ${receipt.transactionHash} succ`)
        return true
      } catch (e: any) {
        console.error('wait for transaction err: ', e.message)
        return false
      }
    }

    return false
  }

  async indexOfHackerTx(incomingTx: TransactionResponse) {
    for (let i = 0; i < this.txs.length; i++) {
      const tx = this.txs[i]
      if ((tx.transaction.from == incomingTx.from || await tx.signer.getAddress() == incomingTx.from) &&
        tx.transaction.nonce == incomingTx.nonce) {
        return i
      }
    }

    return -1
  }

  async isHackerTx(incomingTx: TransactionResponse) {
    // console.log('isHackerTx, tx: ', incomingTx)
    for (let tx of this.txResponses) {
      if (tx.hash != incomingTx.hash && tx.from == incomingTx.from && tx.nonce == incomingTx.nonce) {
        return true
      }
    }

    return false
  }
}

// TODO:
// 1. private wallet sends enough ethers to public wallet.
// 2. public wallet transfers all erc20 tokens to private wallet.
export async function getDefenderBundleTx(
  provider: BaseProvider,
  erc20: ERC20,
  metatx: MinimalForwarder,
  defender: SweeperDefender,
  publicWallet: Wallet,
  privateWallet: Wallet,
  gas?: BigNumber
): Promise<Array<FlashbotsBundleTransaction>> {
  const approveTx = await getApproveERC20Tx(provider, erc20, defender, publicWallet.address, gas)
  const transferTx = await getDelegateFundingAndTransferTx(erc20, metatx, defender, publicWallet, privateWallet)
  const cost = calculateCost([approveTx, transferTx])
  const feedTx = await getFeedTx(provider, privateWallet.address, publicWallet.address, cost)
  return [
    {
      transaction: feedTx,
      signer: privateWallet
    },
    {
      transaction: approveTx,
      signer: publicWallet
    },
    {
      transaction: transferTx,
      signer: privateWallet
    }
  ]
}

async function getApproveERC20Tx(
  provider: BaseProvider,
  erc20: ERC20,
  defender: SweeperDefender,
  publicAddr: string,
  gas?: BigNumber
): Promise<TransactionRequest> {
  const erc20Bal = await erc20.balanceOf(publicAddr)

  return {
    to: erc20.address,
    gasLimit: gas ?
      gas :
      await erc20.estimateGas.approve(
        defender.address, erc20Bal, { from: publicAddr }
      ),
    gasPrice: await provider.getGasPrice(),
    // nonce: await provider.getTransactionCount(publicWallet.address),
    data: erc20.interface.encodeFunctionData('approve', [defender.address, erc20Bal])
  }
}

async function getDelegateFundingAndTransferTx(
  erc20: ERC20,
  metatx: MinimalForwarder,
  defender: SweeperDefender,
  publicWallet: Wallet,
  privateWallet: Wallet,
): Promise<TransactionRequest> {
  const req = await getFundingAndTransferMetaTx(erc20, metatx, defender, publicWallet.address, privateWallet.address)
  const signature = await SignForwardRequest(publicWallet, req, metatx.address)
  try {
    const valid = await metatx.callStatic.verify(req, signature)
    if (!valid) {
      throw Error('meta tx is invalid')
    }
  } catch(e: any) {
    throw Error('meta tx call verify failed: ' + e.message)
  }

  let gas: BigNumber
  try {
    const [succ] = await metatx.callStatic.execute(req, signature)
    if (!succ) {
      throw Error('meta tx execution is failed')
    }
    gas = await metatx.estimateGas.execute(req, signature)
  } catch(e: any) {
    throw Error('meta tx call execute failed')
  }

  const data = metatx.interface.encodeFunctionData('execute', [req, signature])
  return {
    from: privateWallet.address,
    to: metatx.address,
    gasLimit: gas,
    data: data
  }
}

async function getFundingAndTransferMetaTx(
  erc20: ERC20,
  metatx: MinimalForwarder,
  defender: SweeperDefender,
  publicAddr: string,
  privateAddr: string,
): Promise<ForwardRequest> {
  let gas: BigNumber
  try {
    gas = await defender.estimateGas.fundingAndTransfer(erc20.address, privateAddr, { from: privateAddr })
  } catch(e: any) {
    throw Error('Defender call fundingAndTransfer failed: ' + e.message)
  }
  const data = defender.interface.encodeFunctionData('fundingAndTransfer', [erc20.address, privateAddr])

  return {
    from: publicAddr,
    to: defender.address,
    value: 0,
    gas: gas,
    nonce: await metatx.getNonce(publicAddr),
    data: data
  }
}