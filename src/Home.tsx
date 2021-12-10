import { useWeb3React } from "@web3-react/core"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { InjectedConnector } from '@web3-react/injected-connector'
import { BaseProvider, TransactionReceipt, TransactionRequest, Web3Provider } from '@ethersproject/providers'
import { BigNumber, ethers } from "ethers"

import config, { SupportedChainId, SupportedChainInfo, L2ChainInfo } from './config'
import { run as flashbotsRun } from './flashbots'

export default function Home(props: {}) {
  // const { account, activate, active, library } = useWeb3React<Web3Provider>()
  /*
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  devAddr: string,
  feesPercentage: number,
  gas?: BigNumber
  */

  const [chainId, setChainId] = useState(SupportedChainId.GOERLI)
  const [provider, setProvider] = useState(ethers.getDefaultProvider(SupportedChainInfo[chainId].chainUrl))
  const [relayRpc, setRelayRpc] = useState(SupportedChainInfo[chainId].relayRpc)
  const [relayNetwork, setRelayNetwork] = useState(SupportedChainInfo[chainId].relayNetwork)
  const [onlyEstimateCost, setOnlyEstimateCost] = useState(false)
  const [tryblocks, setTryblocks] = useState(15)
  const [erc20Addr, setErc20Addr] = useState('')
  const [privateWalletKey, setPrivateWalletKey] = useState('')
  const [privateWallet, setPrivateWallet] = useState('')
  const [publicWalletKey, setPublicWalletKey] = useState('')
  const [publicWallet, setPublicWallet] = useState('')

  const [devAddr, setDevAddr] = useState(config.devAddr)
  const [feesPercentage, setFeesPercentage] = useState(10)
  const [gas, setGas] = useState(BigNumber.from('250000'))
  const [gasMultiply, setGasMultiply] = useState(BigNumber.from('1'))
  const [timeout, setTimeout] = useState(240)

  const [checkPass, setCheckPass] = useState(false)

  const [receiveAmount, setReceiveAmount] = useState(BigNumber.from(0))

  const [txReceipt, setTxReceipt] = useState<TransactionReceipt>()

  // function connectWallet(event: React.MouseEvent) {
  //   event.preventDefault()
  //   const connector = new InjectedConnector({
  //     supportedChainIds: [1, 5],
  //   })
  //   !active && connector && activate(connector)
  // }

  async function execute(event: React.MouseEvent) {
    event.preventDefault()
    // if (!account || !library) return
    if (!checkPass) {
      alert('check info first')
      return
    }

    flashbotsRun({
      provider: provider,
      timeout: timeout * 1000,
      relayRpc,
      relayNetwork,
      onlyEstimateCost,
      tryblocks,
      erc20Addr,
      privateKey: privateWalletKey,
      publicKey: publicWalletKey,
      devAddr,
      feesPercentage,
      gas,
      gasMultiply
    }).then(receipt => {
      console.log('Sweet! Yuor assets have been withdrawed!! receipt: ', receipt)
      setTxReceipt(receipt)
    })
    .catch(e => {
      console.warn('Unfortunately, this flashbots bundle does not have been mined, err: ', e.message)
    })
  }

  async function onClickCheckInfo(event: React.MouseEvent) {
    event.preventDefault()
    try {
      const publicWallet = new ethers.Wallet(publicWalletKey)
      setPublicWallet(publicWallet.address)
    } catch (e: any) {
      alert('your exposed private key error: ' + e.message)
    }

    try {
      const privateWallet = new ethers.Wallet(privateWalletKey)
      setPrivateWallet(privateWallet.address)
    } catch (e: any) {
      alert('your private key error: ' + e.message)
    }

    if (!ethers.utils.isAddress(erc20Addr)) {
      alert('erc20 address is invalid')
    }

    setCheckPass(true)
  }

  return (
    <div>
      {/* <button onClick={connectWallet}>
        {active ? 'disconnect' : 'connect'} wallet
      </button> */}
      <div>
        <div>
          <span>Network: {SupportedChainInfo[chainId].name}</span>
        </div>
        <div>
          <span>your exposed private key: </span>
          <input type="password" onChange={(e) => setPublicWalletKey(e.currentTarget.value)} />
        </div>
        <div>
          <span>your receiver private key: </span>
          <input type="password" onChange={(e) => setPrivateWalletKey(e.currentTarget.value)} />
        </div>
        <div>
          <span>ERC20 address: </span>
          <input type="text" onChange={(e) => setErc20Addr(e.currentTarget.value)} />
        </div>
      </div>
      <button onClick={onClickCheckInfo}>
        check info
      </button>
      <div>
        <div><span>your exposed account: {publicWallet}</span></div>
        <div><span>receive account: {privateWallet}</span></div>
        <div><span>service fees: {feesPercentage + '%'}</span></div>
        {/* <div><span>you will receive: {ethers.utils.formatEther(receiveAmount)}</span></div> */}
      </div>
      <button onClick={execute}>
        run
      </button>
      <div><span>txReceipt: {JSON.stringify(txReceipt, null, 2)}</span></div>
    </div>
  )
}