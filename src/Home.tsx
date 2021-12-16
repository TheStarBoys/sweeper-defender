import { useWeb3React } from "@web3-react/core"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { InjectedConnector } from '@web3-react/injected-connector'
import { BaseProvider, TransactionReceipt, TransactionRequest, Web3Provider } from '@ethersproject/providers'
import { BigNumber, ethers } from "ethers"

import { SupportedChainId, SupportedChainInfo, SupportedL1ChainId, L2ChainInfo, isL2ChainIDs, Mode } from './config'
import { estimateCost, getBundleTx, run as flashbotsRun } from './flashbots'
import { TxDefender, getDefenderBundleTx, getDefenderBundleTxCost } from './defender'
import { ERC20, ERC20__factory, MinimalForwarder, MinimalForwarder__factory, SweeperDefender, SweeperDefender__factory } from "./contracts"

interface ExecutionInfo {
  txReceipt?: TransactionReceipt
  msg: string
}

export default function Home(props: {}) {
  // const { account, activate, active, library } = useWeb3React<Web3Provider>()
  const [chainId, setChainId] = useState(SupportedChainId.GOERLI)
  const [provider, setProvider] = useState(ethers.getDefaultProvider(SupportedChainInfo[SupportedChainId.GOERLI].chainUrl))
  const [explorerUrl, setExplorerUrl] = useState(SupportedChainInfo[SupportedChainId.GOERLI].explorerUrl)
  const [relayRpc, setRelayRpc] = useState(SupportedChainInfo[SupportedChainId.GOERLI].relayRpc)
  const [relayNetwork, setRelayNetwork] = useState(SupportedChainInfo[SupportedChainId.GOERLI].relayNetwork)
  const [mode, setMode] = useState(Mode.FLASHBOTS)
  const [onlyEstimateCost, setOnlyEstimateCost] = useState(false)
  const [tryblocks, setTryblocks] = useState(15)

  // contracts
  const [erc20Addr, setErc20Addr] = useState('')
  const [symbol, setSymbol] = useState('')
  const [decimals, setDecimals] = useState(18)
  const [erc20Bal, setErc20Bal] = useState(BigNumber.from(0))
  const [erc20, setErc20] = useState<ERC20>()

  const [metatx, setMetatx] = useState<MinimalForwarder>()
  const [defender, setDefender] = useState<SweeperDefender>()

  const [privateWalletKey, setPrivateWalletKey] = useState('')
  const [privateWallet, setPrivateWallet] = useState('')
  const [publicWalletKey, setPublicWalletKey] = useState('')
  const [publicWallet, setPublicWallet] = useState('')

  const [devAddr, setDevAddr] = useState(SupportedChainInfo[chainId].devAddr)
  const [feesPercentage, setFeesPercentage] = useState(SupportedChainInfo[chainId].feesPercentage)
  const [cost, setCost] = useState(BigNumber.from(0))
  const [gas, setGas] = useState(BigNumber.from('300000'))
  const [gasMultiply, setGasMultiply] = useState(BigNumber.from('2'))
  const [timeout, setTimeout] = useState(240)

  const [checkPass, setCheckPass] = useState(false)

  const [receiveAmount, setReceiveAmount] = useState(BigNumber.from(0))

  const [executionInfo, setExecutionInfo] = useState<ExecutionInfo>({ msg: '' })

  useEffect(() => {
    console.log('update network info')
    setProvider(ethers.getDefaultProvider(SupportedChainInfo[chainId].chainUrl))
    setExplorerUrl(SupportedChainInfo[chainId].explorerUrl)
    if (isL2ChainIDs(chainId)) {
      const info = SupportedChainInfo[chainId] as L2ChainInfo
      setRelayRpc(info.relayRpc)
      setRelayNetwork(info.relayNetwork)
    }
    
    setDevAddr(SupportedChainInfo[chainId].devAddr)

    const contractInfo = SupportedChainInfo[chainId].contractInfo
    if (contractInfo) {
      if (contractInfo.MetaTxAddr) {
        console.log(`setMetatx ${contractInfo.MetaTxAddr}...`)
        setMetatx(MinimalForwarder__factory.connect(contractInfo.MetaTxAddr, provider))
      }

      if (contractInfo.SweeperDefenderAddr) {
        console.log(`setDefender ${contractInfo.SweeperDefenderAddr}...`)
        setDefender(SweeperDefender__factory.connect(contractInfo.SweeperDefenderAddr, provider))
      }
    }

    if (mode == Mode.FLASHBOTS) {
      console.log('set flashbots feesPercentage...')
      setFeesPercentage(SupportedChainInfo[chainId].feesPercentage)
    } else {
      if (defender) {
        console.log('set defender feesPercentage...')
        try {
          defender.callStatic.feesPercentage().then(percentage => {
            setFeesPercentage(percentage.toNumber())
          })
        } catch(e: any) {
          console.error('get defender feesPercentage err: ', e.message)
          return
        }
      }
    }
  }, [chainId, mode])

  // function connectWallet(event: React.MouseEvent) {
  //   event.preventDefault()
  //   const connector = new InjectedConnector({
  //     supportedChainIds: [1, 5],
  //   })
  //   !active && connector && activate(connector)
  // }

  async function execute(event: React.MouseEvent) {
    console.log('execute...')
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

    if (mode == Mode.FLASHBOTS) {
      flashbotsRun(options)
        .then(receipt => {
          console.log('Sweet! Yuor assets have been withdrawed!! receipt: ', receipt)
          setExecutionInfo({ msg: 'Sweet! Yuor assets have been withdrawed!!', txReceipt: receipt })
        })
        .catch(e => {
          console.warn('Unfortunately, this flashbots bundle does not have been mined, err: ', e.message)
          setExecutionInfo({ msg: 'Unfortunately, this flashbots bundle does not have been mined. ' + e.message })
        })
    } else {
      if (!erc20 || !metatx || !defender) {
        alert('This network does not have supported defender yet')
        return
      }
      const txs = await getDefenderBundleTx(
        provider, erc20, metatx, defender,
        new ethers.Wallet(publicWalletKey, provider),
        new ethers.Wallet(privateWalletKey, provider),
        gas,
        gasMultiply
      )
      const txDefender = new TxDefender(SupportedChainInfo[chainId].chainWsUrl, provider, txs)
      txDefender.run()
        .then(receipts => {
          console.log('defender get receipts...')
          if (!receipts || receipts.length == 0) return
          const receipt = receipts[receipts.length-1]
          console.log('Sweet! Yuor assets have been withdrawed!! receipt: ', receipt)
          setExecutionInfo({ msg: 'Sweet! Yuor assets have been withdrawed!!', txReceipt: receipt })
        }).catch(e => {
          console.trace('Unfortunately, this flashbots bundle does not have been mined, err: ', e.message)
          setExecutionInfo({ msg: 'Unfortunately, this flashbots bundle does not have been mined. ' + e.message })
        })
        .finally(() => {
          txDefender.close()
        })
    }

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

  function onModeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    event.preventDefault()

    const value = Number(event.currentTarget.value)
    if (value in Mode) {
      console.log('change mode to: ', value)
      setMode(value)
    }
  }

  async function onClickCheckInfo(event: React.MouseEvent) {
    console.log('onClickCheckInfo...')
    event.preventDefault()

    console.log('check public wallet...')

    let publicWallet
    try {
      publicWallet = new ethers.Wallet(publicWalletKey)
      setPublicWallet(publicWallet.address)
    } catch (e: any) {
      alert('your exposed private key error: ' + e.message)
      return
    }

    console.log('check private wallet...')
    let privateWallet
    try {
      privateWallet = new ethers.Wallet(privateWalletKey)
      setPrivateWallet(privateWallet.address)
    } catch (e: any) {
      alert('your private key error: ' + e.message)
      return
    }

    console.log(`check erc20 address ${erc20Addr}...`)
    if (!ethers.utils.isAddress(erc20Addr)) {
      alert('erc20 address is invalid')
      return
    }

    const erc20 = ERC20__factory.connect(erc20Addr, provider)
    setErc20(erc20)
    if (erc20) {
      console.log('check erc20 balance...')
      try {
        const erc20Bal = await erc20.callStatic.balanceOf(publicWallet.address)
        if (erc20Bal.eq(BigNumber.from(0))) {
          alert('your ER20 balance is zero')
          return
        }
        setErc20Bal(erc20Bal)
      } catch(e: any) {
        console.error('check erc20 balance err: ', e.message)
        return
      }
      
      try {
        console.log('try get erc20 symbol...')
        setSymbol(await erc20.callStatic.symbol())
      } catch (e: any) {
        console.warn('maybe this erc20 does not have symbol method: ', e.message)
        setSymbol('units')
      }

      try {
        console.log('try get erc20 decimals...')
        setDecimals(await erc20.callStatic.decimals())
      } catch(e: any) {
        console.warn('maybe this erc20 does not have decimals method: ', e.message)
      }
      setReceiveAmount(erc20Bal.mul(BigNumber.from(100).sub(feesPercentage)).div(BigNumber.from(100)))
    }

    if (mode == Mode.FLASHBOTS) {
      console.log('check flashbots...')
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
  
      try {
        const cost = await estimateCost(options)
        setCost(cost)
      } catch (e: any) {
        console.error('estimate cost err: ', e.message)
        return
      }
    } else {
      console.log('check defender...')
      if (!erc20 || !metatx || !defender) {
        alert('This network does not have supported defender yet')
        return
      }
      try {
        const cost = await getDefenderBundleTxCost(
          provider, erc20, metatx, defender,
          new ethers.Wallet(publicWallet, provider),
          new ethers.Wallet(privateWallet, provider),
          gas, gasMultiply
        )
        setCost(cost)
      } catch(e: any) {
        console.error('estimate cost err: ', e.message)
        return
      }
    }

    console.log('check payer balance...')
    const payerBal = await provider.getBalance(privateWallet.address)
    if (payerBal.lt(cost)) {
      alert('payer balance is not enough')
      return
    }

    console.log('set check pass')
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
            <option value={SupportedChainId.RINKEBY}>Rinkeby</option>
            <option value={SupportedChainId.GOERLI}>Goerli</option>
          </select>
          <span> Mode: </span>
          <select onChange={onModeChange} defaultValue={isL2ChainIDs(chainId) ? Mode.FLASHBOTS : Mode.DEFENDER}>
            {
              isL2ChainIDs(chainId) ? <option value={Mode.FLASHBOTS}>Flashbots</option> : null
            }
            <option value={Mode.DEFENDER}>Defender</option>
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
          <input type="text" defaultValue={gas.toString()} onChange={(e) => {
            try {
              setGas(BigNumber.from(e.currentTarget.value))
            } catch (e: any) {
              console.warn('gas is invalid: ', e.message)
            }
          }} />
        </div>
        <div>
          <span>gas multiply: </span>
          <input type="text" defaultValue={gasMultiply.toString()} onChange={(e) => {
            const value = e.currentTarget.value
            try {
              setGasMultiply(BigNumber.from(value))
            } catch (e: any) {
              console.warn('gas multiply is invalid: ', e.message)
            }
          }} />
        </div>
      </div>
      <button onClick={onClickCheckInfo}>
        check info
      </button>
      <div>
        <div><span>your exposed account: {publicWallet}</span></div>
        <div><span>receiver account: {privateWallet}</span></div>
        <div><span>your exposed account owned: {ethers.utils.formatUnits(erc20Bal, decimals)} {symbol}</span></div>
        <div><span>your receiver account will pay: {ethers.utils.formatEther(cost)} ETH</span></div>
        {/* TODO: sometimes the value is not updated. */}
        <div><span>your receiver account will receive: {ethers.utils.formatUnits(receiveAmount, decimals)} {symbol}</span></div>
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