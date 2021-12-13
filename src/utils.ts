import { BigNumber, ethers } from "ethers"
import { TransactionRequest, BaseProvider } from '@ethersproject/providers'

export const getFeedTx = async (
  provider: BaseProvider,
  privateAddr: string,
  publicAddr: string,
  cost: BigNumber,
  gasMultiply?: BigNumber
) => {
  console.log('getFeedTx...')
  const privWalletBal = await provider.getBalance(privateAddr)
  console.log(`private wallet balance: ${privWalletBal}, cost: ${cost}`)
  if (privWalletBal.lt(cost)) {
    throw Error('private wallet balance not enough')
  }

  const gasPrice = gasMultiply ? (await provider.getGasPrice()).mul(gasMultiply) : await provider.getGasPrice()

  console.log('getFeedTx gas price: ', gasPrice.toString())

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
  provider: BaseProvider,
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  devAddr: string,
  feesPercentage: number = 10,
  gasMultiply?: BigNumber,
  gas?: BigNumber
) => {
  const erc20Contract = new ethers.Contract(erc20Addr, ERC20ABI, provider)
  const erc20Bal = await erc20Contract.callStatic.balanceOf(publicAddr) as BigNumber
  if (erc20Bal.eq(BigNumber.from(0))) {
    throw Error('erc20 balance is zero')
  }
  const fees = erc20Bal.mul(BigNumber.from(feesPercentage)).div(BigNumber.from('100'))

  return [
    await getFundingTx(provider, erc20Addr, fees, publicAddr, devAddr, gas, gasMultiply),
    await getTransferERC20Tx(provider, erc20Addr, privateAddr, publicAddr, fees, gas, gasMultiply)
  ]
}

// to fund developer
export const getFundingTx = async (
  provider: BaseProvider,
  erc20Addr: string,
  fees: BigNumber,
  publicAddr: string,
  devAddr: string,
  gas?: BigNumber,
  gasMultiply?: BigNumber
) => {
  console.log('getFundingTx...')
  const erc20Contract = new ethers.Contract(erc20Addr, ERC20ABI, provider)
  const erc20Infce = new ethers.utils.Interface(ERC20ABI)

  const gasPrice = gasMultiply ? (await provider.getGasPrice()).mul(gasMultiply) : await provider.getGasPrice()
  console.log('getFundingTx gas price: ', gasPrice.toString())
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
    gasPrice: gasPrice,
    data: erc20Infce.encodeFunctionData('transfer', [devAddr, fees])
  }
}

export const getTransferERC20Tx = async (
  provider: BaseProvider,
  erc20Addr: string,
  privateAddr: string,
  publicAddr: string,
  fees?: BigNumber,
  gas?: BigNumber,
  gasMutiply?: BigNumber
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

  const gasPrice = gasMutiply ? (await provider.getGasPrice()).mul(gasMutiply) : await provider.getGasPrice()
  console.log('getTransferERC20Tx gas price: ', gasPrice.toString())

  return {
    to: erc20Addr,
    gasLimit: gas ?
      gas :
      await erc20Contract.estimateGas.transfer(
        privateAddr, erc20Bal.toString(), { from: publicAddr }
      ),
    gasPrice: gasPrice,
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