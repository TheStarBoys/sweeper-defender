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
    relayRpc: '/flashbots-relay',
    relayNetwork: 'mainnet'
  },
  [SupportedChainId.GOERLI]: {
    name: 'goerli',
    chainUrl: 'https://goerli.infura.io/v3/5db9fb69ed204c2bb38e3c5330b17947',
    relayRpc: '/flashbots-relay-goerli',
    relayNetwork: 'goerli'
  }
}

export default {
  devAddr: '0x9eFC76c32a8774d35c2CDAe06f2053DF1A40b288'
}