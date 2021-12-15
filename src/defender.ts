import { FlashbotsBundleProvider, FlashbotsBundleRawTransaction, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle'
import { BaseProvider, TransactionReceipt, TransactionRequest, TransactionResponse } from '@ethersproject/providers'
import { BigNumber, ethers } from 'ethers'
import Web3 from 'web3'
import { time } from 'console'
import { sleep } from './utils'
import { Subscription } from 'web3-core-subscriptions'

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
    this.getTxMaxCount = 2
    this.getTxInterval = 500

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
          console.log('incoming txHash: ', txResponse.hash)
          this.onGetTxFromTxPool(txResponse)
          break
        } catch (err) {
          console.error(err);
        }
      }
    })

    for (let i = 0; i < this.txs.length; ) {
      await this.sendTx()
      const succ = await this.waitForTransaction()
      if (!succ) {
        throw Error('wait for transaction time out')
      }
    }

    return this.txReceipts
  }

  async close() {
    await this.pendingTxSub.unsubscribe()
  }

  private onGetTxFromTxPool(incomingTx: TransactionResponse) {
    if (!this.isHackerTx(incomingTx)) return
    console.log("It's hacker tx, try to replace it...")
    let index = this.indexOfHackerTx(incomingTx)

    const nextGasPrice = BigNumber.from(incomingTx.gasPrice).mul(BigNumber.from(110)).div(BigNumber.from(100))
    this.txs[index].transaction.gasPrice = nextGasPrice
    // send again
    this.sendTx()
  }

  private async sendTx() {
    const bundleTx = this.txs[this.curr]
    const signedTx = await bundleTx.signer.signTransaction(bundleTx.transaction)
    const response = await this.provider.sendTransaction(signedTx)
    console.log('send transaction: ', response)

    if (this.curr >= this.txResponses.length) {
      // insert
      this.txResponses = this.txResponses.concat(response)
    } else {
      // update
      this.txResponses[this.curr] = response
    }
  }

  private async waitForTransaction() {
    console.log('wait for transaction, curr: ', this.curr)
    let startTime = Date.now()
    while (Date.now() - startTime < this.timeout) {
      try{
        const txHash = this.txResponses[this.curr].hash
        const response = await this.provider.getTransaction(txHash)
        if (response.blockNumber) {
          const receipt = await this.provider.getTransactionReceipt(txHash)
          this.txReceipts = this.txReceipts.concat(receipt)
          this.curr++
          return true
        }
        await sleep(100)
      } catch(e: any) {
        console.error('wait for transaction err: ', e.message)
        return false
      }
    }
    
    return false
  }

  indexOfHackerTx(incomingTx: TransactionResponse) {
    for (let i = 0; i < this.txs.length; i++) {
      const tx = this.txs[i]
      if (tx.transaction.from == incomingTx.from && tx.transaction.nonce == incomingTx.nonce) {
        return i
      }
    }

    return -1
  }

  isHackerTx(incomingTx: TransactionResponse) {
    if (this.isProtectiveTx(incomingTx)) return false

    for (let tx of this.txs) {
      if (tx.transaction.from == incomingTx.from && tx.transaction.nonce == incomingTx.nonce) {
        return true
      }
    }

    return false
  }

  isProtectiveTx(incomingTx: TransactionResponse) {
    for (let bundleTx of this.txs) {
      const tx = bundleTx.transaction
      if (tx.from == incomingTx.from && tx.to == incomingTx.to &&
        tx.value == incomingTx.value && tx.gasLimit == incomingTx.gasLimit &&
        tx.gasPrice == incomingTx.gasPrice && tx.data == incomingTx.data &&
        tx.nonce == incomingTx.nonce) {

        return true
      }
    }

    return false
  }
}