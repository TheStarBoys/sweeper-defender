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
  const [relayRpc, setRelayRpc] = useState('https://relay-goerli.flashbots.net')
  const [relayNetwork, setRelayNetwork] = useState('goerli')
  const [onlyEstimateCost, setOnlyEstimateCost] = useState(false)
  const [tryblocks, setTryblocks] = useState(10)
  const [erc20Addr, setErc20Addr] = useState('0x4734C809Cd59C87753Ebe95B494C0056513ceF85')
  const [privateWallet, setPrivateWallet] = useState('073e51e855e1882bcba7c2cacf92d9c9ad94dfe9345b0e9f07fcf5adf9e9f22b')
  const [publicWallet, setPublicWallet] = useState('665a4dba0eab0bda352d7d6c2b0ef9ac5fdb28f4ae0c9075f9d7fc10a049ab01')
  const [devAddr, setDevAddr] = useState('0x4Fc27FB1830Ef7F7Ade3c51D81e7214F98D7Df2d')
  const [feesPercentage, setFeesPercentage] = useState(10)
  const [gas, setGas] = useState(BigNumber.from('25000'))

  return (
    <div>
      <button onClick={(event) => {
        event.preventDefault()
        const connector = new InjectedConnector({
          supportedChainIds: [1, 5],
        })
        !active && connector && activate(connector)
      }}
      >
        {active ? 'disconnect' : 'connect'} wallet
      </button>
      <div>
        <span>account: {account}</span>
      </div>
      <button onClick={async (event) => {
        event.preventDefault()
        if (!account || !library) return

        await flashbotsRun({
          provider: library,
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
        })
      }}
      >
        sende ether
      </button>
    </div>
  )
}