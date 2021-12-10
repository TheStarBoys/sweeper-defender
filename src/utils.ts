import { BigNumber, ethers } from "ethers"
import { TransactionRequest, Web3Provider } from '@ethersproject/providers'

export const getFeedTx = async (
  provider: Web3Provider,
  privateAddr: string,
  publicAddr: string,
  cost: BigNumber
) => {
  console.log('getFeedTx...')
  const privWalletBal = await provider.getBalance(privateAddr)
  console.log(`private wallet balance: ${privWalletBal}, cost: ${cost}`)
  if (privWalletBal.lt(cost)) {
    throw Error('private wallet balance not enough')
  }

  return {
    to: publicAddr,
    gasLimit: BigNumber.from('21000'),
    gasPrice: await provider.getGasPrice(),
    nonce: await provider.getTransactionCount(privateAddr),
    value: cost,
  }
}

const ERC20ABI = `
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
`

export const getFundingAndTransferTxs = async (
  provider: Web3Provider,
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  devAddr: string,
  feesPercentage: number = 10,
  gas?: BigNumber
) => {
  const erc20Contract = new ethers.Contract(erc20Addr, ERC20ABI, provider)
  const erc20Bal = await erc20Contract.callStatic.balanceOf(publicAddr) as BigNumber
  if (erc20Bal.eq(BigNumber.from(0))) {
    throw Error('erc20 balance is zero')
  }
  const fees = erc20Bal.mul(BigNumber.from(feesPercentage)).div(BigNumber.from('100'))

  return [
    await getFundingTx(provider, erc20Addr, fees, publicAddr, devAddr, gas),
    await getTransferERC20Tx(provider, erc20Addr, privateAddr, publicAddr, fees, gas)
  ]
}

// to fund developer
export const getFundingTx = async (
  provider: Web3Provider,
  erc20Addr: string,
  fees: BigNumber,
  publicAddr: string,
  devAddr: string,
  gas?: BigNumber
) => {
  console.log('getFundingTx...')
  const erc20Contract = new ethers.Contract(erc20Addr, ERC20ABI, provider)
  const erc20Infce = new ethers.utils.Interface(ERC20ABI)
  return {
    to: erc20Addr,
    gasLimit: gas ?
      gas :
      await erc20Contract.estimateGas.transfer(
        devAddr,
        fees,
        {
          from: publicAddr
        }
      ),
    gasPrice: await provider.getGasPrice(),
    data: erc20Infce.encodeFunctionData('transfer', [devAddr, fees])
  }
}

export const getTransferERC20Tx = async (
  provider: Web3Provider,
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  fees?: BigNumber,
  gas?: BigNumber
) => {
  console.log('getTransferERC20Tx...')
  const erc20Contract = new ethers.Contract(erc20Addr, ERC20ABI, provider)
  const erc20Infce = new ethers.utils.Interface(ERC20ABI)
  let erc20Bal = await erc20Contract.callStatic.balanceOf(publicAddr)

  if (fees) {
    erc20Bal = erc20Bal.sub(fees)
    console.log('deduct fees...')
  }

  console.log('erc20 balance: ', ethers.utils.formatEther(erc20Bal))

  return {
    to: erc20Addr,
    gasLimit: gas ?
      gas :
      await erc20Contract.estimateGas.transfer(
        privateAddr, erc20Bal.toString(), { from: publicAddr }
      ),
    gasPrice: (await provider.getGasPrice()).mul(BigNumber.from('3')),
    // nonce: await provider.getTransactionCount(publicWallet.address),
    data: erc20Infce.encodeFunctionData('transfer', [privateAddr, erc20Bal.toString()])
  }
}


export const calculateCost = (txs: Array<TransactionRequest>) => {
  let cost = BigNumber.from('0')
  for (let tx of txs) {
    cost = cost.add((tx.gasLimit as BigNumber).mul(tx.gasPrice as BigNumber))
  }

  return cost
}