const INFURA_KEY = '5db9fb69ed204c2bb38e3c5330b17947'

// Total cost:
// 0.25 ETH or
// 0.025 BNB
export interface ContractInfo {
  MetaTxAddr?: string // It will cost 1186688 gas
  SweeperDefenderAddr?: string // It will cost 1298099 gas
}

export enum SupportedChainId {
  MAINNET = 1,
  RINKEBY = 4,
  GOERLI = 5
}

export const L1_CHAIN_IDS = [
  SupportedChainId.RINKEBY,
] as const

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number]

export function isL2ChainIDs(chainId: number): boolean {
  for (let id of L2_CHAIN_IDS) {
    if (chainId == id) {
      return true
    }
  }

  return false
}

export const L2_CHAIN_IDS = [
  SupportedChainId.MAINNET,
  SupportedChainId.GOERLI,
] as const

export type SupportedL2ChainId = typeof L2_CHAIN_IDS[number]

export interface L1ChainInfo {
  name: string
  chainUrl: string
  chainWsUrl: string
  devAddr: string
  feesPercentage: number
  explorerUrl: string
  contractInfo?: ContractInfo
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
    chainUrl: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    chainWsUrl: `wss://mainnet.infura.io/ws/v3/${INFURA_KEY}`,
    devAddr: '0x3f7E2b941FF52bC2808f1039c69594FA7e95cd92',
    feesPercentage: 1,
    explorerUrl: 'https://etherscan.io',
    relayRpc: '/flashbots-relay',
    relayNetwork: 'mainnet'
  },
  [SupportedChainId.RINKEBY]: {
    name: 'rinkeby',
    chainUrl: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    chainWsUrl: `wss://rinkeby.infura.io/ws/v3/${INFURA_KEY}`,
    devAddr: '0x9eFC76c32a8774d35c2CDAe06f2053DF1A40b288',
    feesPercentage: 10,
    explorerUrl: 'https://rinkeby.etherscan.io',
  },
  [SupportedChainId.GOERLI]: {
    name: 'goerli',
    chainUrl: `https://goerli.infura.io/v3/${INFURA_KEY}`,
    chainWsUrl: `wss://goerli.infura.io/ws/v3/${INFURA_KEY}`,
    devAddr: '0x9eFC76c32a8774d35c2CDAe06f2053DF1A40b288',
    feesPercentage: 10,
    explorerUrl: 'https://goerli.etherscan.io',
    relayRpc: '/flashbots-relay-goerli',
    relayNetwork: 'goerli',
    contractInfo: {
      MetaTxAddr: '0xa4EA647A6EF4971955966412a30175AAC1E6B445',
      SweeperDefenderAddr: '0x357aaFFcf3651177dCFa523620E16035F4337403'
    }
  }
}

export enum Mode {
  FLASHBOTS = 1,
  DEFENDER = 2
}