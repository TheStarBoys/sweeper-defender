import { useWeb3React } from "@web3-react/core"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { InjectedConnector } from '@web3-react/injected-connector'
import { BaseProvider, TransactionReceipt, TransactionRequest, Web3Provider } from '@ethersproject/providers'
import { BigNumber, ethers } from "ethers"

import { SupportedChainId, SupportedChainInfo, L2ChainInfo } from './config'
import { estimateCost, run as flashbotsRun } from './flashbots'

interface ExecutionInfo {
  txReceipt?: TransactionReceipt
  msg: string
}

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
  const [explorerUrl, setExplorerUrl] = useState(SupportedChainInfo[chainId].explorerUrl)
  const [relayRpc, setRelayRpc] = useState(SupportedChainInfo[chainId].relayRpc)
  const [relayNetwork, setRelayNetwork] = useState(SupportedChainInfo[chainId].relayNetwork)
  const [onlyEstimateCost, setOnlyEstimateCost] = useState(false)
  const [tryblocks, setTryblocks] = useState(15)
  const [erc20Addr, setErc20Addr] = useState('')
  const [privateWalletKey, setPrivateWalletKey] = useState('')
  const [privateWallet, setPrivateWallet] = useState('')
  const [publicWalletKey, setPublicWalletKey] = useState('')
  const [publicWallet, setPublicWallet] = useState('')

  const [devAddr, setDevAddr] = useState(SupportedChainInfo[chainId].devAddr)
  const [feesPercentage, setFeesPercentage] = useState(SupportedChainInfo[chainId].feesPercentage)
  const [cost, setCost] = useState(BigNumber.from(0))
  const [gas, setGas] = useState(BigNumber.from('250000'))
  const [gasMultiply, setGasMultiply] = useState(BigNumber.from('2'))
  const [timeout, setTimeout] = useState(240)

  const [checkPass, setCheckPass] = useState(false)

  const [receiveAmount, setReceiveAmount] = useState(BigNumber.from(0))

  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo>({ msg: '' })

  useEffect(() => {
    console.log('update network info')
    setProvider(ethers.getDefaultProvider(SupportedChainInfo[chainId].chainUrl))
    setExplorerUrl(SupportedChainInfo[chainId].explorerUrl)
    setRelayRpc(SupportedChainInfo[chainId].relayRpc)
    setRelayNetwork(SupportedChainInfo[chainId].relayNetwork)
    setDevAddr(SupportedChainInfo[chainId].devAddr)
    setFeesPercentage(SupportedChainInfo[chainId].feesPercentage)
  }, [chainId])

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

    setExecutionInfo({ msg: 'start executing, wait a moment...' })

    const options = {
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
    }

    flashbotsRun(options)
      .then(receipt => {
        console.log('Sweet! Yuor assets have been withdrawed!! receipt: ', receipt)
        setExecutionInfo({ msg: 'Sweet! Yuor assets have been withdrawed!!', txReceipt: receipt })
      })
      .catch(e => {
        console.warn('Unfortunately, this flashbots bundle does not have been mined, err: ', e.message)
        setExecutionInfo({ msg: 'Unfortunately, this flashbots bundle does not have been mined. ' + e.message })
      })
    
    setCheckPass(false)
  }

  function onNetworkChange(event: React.ChangeEvent<HTMLSelectElement>) {
    event.preventDefault()

    const value = Number(event.currentTarget.value)
    if (value in SupportedChainId) {
      console.log('change network to: ', value)
      setChainId(value)
    }
  }

  async function onClickCheckInfo(event: React.MouseEvent) {
    event.preventDefault()

    let publicWallet
    try {
      publicWallet = new ethers.Wallet(publicWalletKey)
      setPublicWallet(publicWallet.address)
    } catch (e: any) {
      alert('your exposed private key error: ' + e.message)
      return
    }

    let privateWallet
    try {
      privateWallet = new ethers.Wallet(privateWalletKey)
      setPrivateWallet(privateWallet.address)
    } catch (e: any) {
      alert('your private key error: ' + e.message)
      return
    }

    if (!ethers.utils.isAddress(erc20Addr)) {
      alert('erc20 address is invalid')
      return
    }

    const options = {
      provider: provider,
      timeout: timeout * 1000,
      relayRpc,
      relayNetwork,
      onlyEstimateCost: true,
      tryblocks,
      erc20Addr,
      privateKey: privateWalletKey,
      publicKey: publicWalletKey,
      devAddr,
      feesPercentage,
      gas,
      gasMultiply
    }

    const cost = await estimateCost(options)
    setCost(cost)

    const payerBal = await provider.getBalance(privateWallet.address)
    if (payerBal.lt(cost)) {
      alert('payer balance is not enough')
      return
    }

    setCheckPass(true)
  }

  return (
    <div style={{ margin: "10px" }}>
      {/* <button onClick={connectWallet}>
        {active ? 'disconnect' : 'connect'} wallet
      </button> */}
      <div>
        <div>
          <span>Network: </span>
          <select onChange={onNetworkChange} defaultValue={SupportedChainId.GOERLI}>
            <option value={SupportedChainId.MAINNET}>Mainnet</option>
            <option value={SupportedChainId.GOERLI}>Goerli</option>
          </select>
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
        <div>
          <span>gas for contract execution: </span>
          <input type="text" defaultValue={gas.toString()} onChange={(e) => setGas(BigNumber.from(e.currentTarget.value))} />
        </div>
        <div>
          <span>gas multiply: </span>
          <input type="text" defaultValue={gasMultiply.toString()} onChange={(e) => setGasMultiply(BigNumber.from(e.currentTarget.value))} />
        </div>
      </div>
      <button onClick={onClickCheckInfo}>
        check info
      </button>
      <div>
        <div><span>your exposed account: {publicWallet}</span></div>
        <div><span>receiver account: {privateWallet}</span></div>
        <div><span>your receive account will pay: {ethers.utils.formatEther(cost)} ETH</span></div>
        <div><span>service addr: {devAddr}</span></div>
        <div><span>service fees: {feesPercentage} %</span></div>
        {/* <div><span>you will receive: {ethers.utils.formatEther(receiveAmount)}</span></div> */}
      </div>
      <button onClick={execute}>
        run
      </button>
      <div>
        <span>{executionInfo.msg}</span>
        {
          executionInfo.txReceipt ?
            <span> The transaction <a href={explorerUrl + '/tx/' + executionInfo.txReceipt.transactionHash}>{executionInfo.txReceipt.transactionHash}</a> was mined at {executionInfo.txReceipt.blockNumber}
            </span>
            :
            <span></span>
        }

      </div>
    </div>
  )
}