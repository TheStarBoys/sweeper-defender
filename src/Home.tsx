import { useWeb3React } from "@web3-react/core"
import { useEffect, useState } from "react"
import { InjectedConnector } from '@web3-react/injected-connector'
import { TransactionRequest, Web3Provider } from '@ethersproject/providers'
import { BigNumber, ethers } from "ethers"

import { run as flashbotsRun } from './flashbots'

export default function Home(props: {}) {
  const { account, chainId, activate, active, library } = useWeb3React<Web3Provider>()
  /*
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  devAddr: string,
  feesPercentage: number,
  gas?: BigNumber
  */
  const [relayRpc, setRelayRpc] = useState('/flashbots-relay-goerli')
  const [relayNetwork, setRelayNetwork] = useState('goerli')
  const [onlyEstimateCost, setOnlyEstimateCost] = useState(false)
  const [tryblocks, setTryblocks] = useState(15)
  const [erc20Addr, setErc20Addr] = useState('0x4734C809Cd59C87753Ebe95B494C0056513ceF85')
  const [privateWallet, setPrivateWallet] = useState('073e51e855e1882bcba7c2cacf92d9c9ad94dfe9345b0e9f07fcf5adf9e9f22b')
  const [publicWallet, setPublicWallet] = useState('665a4dba0eab0bda352d7d6c2b0ef9ac5fdb28f4ae0c9075f9d7fc10a049ab01')
  const [devAddr, setDevAddr] = useState('0x9eFC76c32a8774d35c2CDAe06f2053DF1A40b288')
  const [feesPercentage, setFeesPercentage] = useState(10)
  const [gas, setGas] = useState(BigNumber.from('250000'))
  const [gasMultiply, setGasMultiply] = useState(BigNumber.from('1'))
  const [timeout, setTimeout] = useState(240)

  function connectWallet(event: React.MouseEvent) {
    event.preventDefault()
    const connector = new InjectedConnector({
      supportedChainIds: [1, 5],
    })
    !active && connector && activate(connector)
  }

  async function execute(event: React.MouseEvent) {
    event.preventDefault()
    if (!account || !library) return

    // TODO: for test
    const provider = ethers.getDefaultProvider('https://goerli.infura.io/v3/5db9fb69ed204c2bb38e3c5330b17947')
    await flashbotsRun({
      provider: provider,
      timeout: timeout * 1000,
      relayRpc,
      relayNetwork,
      onlyEstimateCost,
      tryblocks,
      erc20Addr,
      privateKey: privateWallet,
      publicKey: publicWallet,
      devAddr,
      feesPercentage,
      gas,
      gasMultiply
    })
  }

  return (
    <div>
      <button onClick={connectWallet}>
        {active ? 'disconnect' : 'connect'} wallet
      </button>
      <div>
        <span>account: {account}</span>
      </div>
      <button onClick={execute}>
        sende ether
      </button>
    </div>
  )
}