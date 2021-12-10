import { FlashbotsBundleProvider, FlashbotsBundleRawTransaction, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle'
import { BigNumber, ethers } from 'ethers'
import { Web3Provider } from '@ethersproject/providers'
import { calculateCost, getFeedTx, getFundingAndTransferTxs } from './utils'
import { toBN, fromWei } from 'web3-utils'


export interface Options {
  provider: Web3Provider,
  relayRpc: string,
  relayNetwork: string,

  onlyEstimateCost: boolean,
  tryblocks: number,

  erc20Addr: string,
  privateKey: string,
  publicKey: string,
  devAddr: string,
  feesPercentage: number,
  gas?: BigNumber
}

export const run = async (
  options: Options
) => {
  const {
    provider, relayRpc, relayNetwork, erc20Addr, privateKey, publicKey, devAddr,
    onlyEstimateCost, tryblocks,
    feesPercentage, gas, 
  } = options

  const privateWallet = new ethers.Wallet(privateKey, provider)
  const privateAddr = privateWallet.address
  const publicWallet = new ethers.Wallet(publicKey, provider)
  const publicAddr = publicWallet.address

  const blockNumber = await provider.getBlockNumber()

  const authSigner = ethers.Wallet.createRandom(provider)
  const flashbotsProvider = await FlashbotsBundleProvider.create(
    provider,
    authSigner,
    relayRpc,
    relayNetwork
  )

  // NOTE: bundle must use at least 42000 for gas

  console.log('signBundle...')

  const txs = await getFundingAndTransferTxs(
    provider,
    erc20Addr,
    privateAddr,
    publicAddr,
    devAddr,
    feesPercentage,
    gas
  )
  const cost = calculateCost(txs)

  console.log('cost: ', fromWei(cost.toString()))

  if (onlyEstimateCost) {
    return
  }

  const signedBundle = await flashbotsProvider.signBundle([
    {
      signer: privateWallet, // private
      transaction: await getFeedTx(provider, privateAddr, publicAddr, cost)
    },
    {
      signer: publicWallet, // public
      transaction: txs[0]
    },
    {
      signer: publicWallet, // public
      transaction: txs[1]
    }
  ])
  console.log('signedBundle: ', signedBundle);

  console.log('Simulate transactions...')

  const simulation = await flashbotsProvider.simulate(
    signedBundle,
    blockNumber + 1
  );
  console.log(new Date());

  // Using TypeScript discrimination
  if ("error" in simulation) {
    console.log(`Simulation Error: ${simulation.error.message}`);
    return
  } else {
    console.log(
      `Simulation Success: ${blockNumber} ${JSON.stringify(
        simulation,
        null,
        2
      )}`
    );
  }

  console.log('sendRawBunble...')

  for (var i = 1; i <= tryblocks; i++) {
    const bundleSubmission = flashbotsProvider.sendRawBundle(
      signedBundle,
      blockNumber + i
    );
    if (i == 1) {
      console.log('bundleTx: ', await bundleSubmission)
    }
    console.log("submitted for block # ", blockNumber + i);

  }
  console.log("bundles submitted");
}