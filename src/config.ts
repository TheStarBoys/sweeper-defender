export enum SupportedChainId {
  MAINNET = 1,
  GOERLI = 5
}

export const L1_CHAIN_IDS = [

] as const

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number]

export const L2_CHAIN_IDS = [
  SupportedChainId.MAINNET,
  SupportedChainId.GOERLI,
] as const

export type SupportedL2ChainId = typeof L2_CHAIN_IDS[number]

export interface L1ChainInfo {
  name: string
  chainUrl: string
  devAddr: string
  feesPercentage: number
  explorerUrl: string
}

export interface L2ChainInfo  extends L1ChainInfo{
  relayRpc: string
  relayNetwork: string
}

export type ChainInfo = { readonly [chainId: number]: L1ChainInfo | L2ChainInfo } &
{ readonly [chainId in SupportedL1ChainId]: L1ChainInfo} &
{ readonly [chainId in SupportedL2ChainId]: L2ChainInfo}

export const SupportedChainInfo: ChainInfo = {
  [SupportedChainId.MAINNET]: {
    name: 'mainnet',
    chainUrl: 'https://mainnet.infura.io/v3/5db9fb69ed204c2bb38e3c5330b17947',
    devAddr: '0x3f7E2b941FF52bC2808f1039c69594FA7e95cd92',
    feesPercentage: 1,
    explorerUrl: 'https://etherscan.io',
    relayRpc: '/flashbots-relay',
    relayNetwork: 'mainnet'
  },
  [SupportedChainId.GOERLI]: {
    name: 'goerli',
    chainUrl: 'https://goerli.infura.io/v3/5db9fb69ed204c2bb38e3c5330b17947',
    devAddr: '0x9eFC76c32a8774d35c2CDAe06f2053DF1A40b288',
    feesPercentage: 10,
    explorerUrl: 'https://goerli.etherscan.io',
    relayRpc: '/flashbots-relay-goerli',
    relayNetwork: 'goerli'
  }
}
