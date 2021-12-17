import { BigNumberish } from "@ethersproject/bignumber";
import { BytesLike } from "@ethersproject/bytes";
import { Wallet } from 'ethers'

export interface ForwardRequest {
  from: string
  to: string
  value: BigNumberish
  gas: BigNumberish
  nonce: BigNumberish
  data: BytesLike
}

export async function SignForwardRequest(wallet: Wallet, req: ForwardRequest, minimalForwarderAddr: string) {
  console.log('test signTypedData...')
  const provider = wallet.provider
  if (!provider) throw Error('SignForwardRequest got error: signer needs provider')

  const domain = {
    // Defining the chain aka Rinkeby testnet or Ethereum Main Net
    chainId: (await provider.getNetwork()).chainId,
    // Give a user friendly name to the specific contract you are signing for.
    name: 'MinimalForwarder',
    // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
    verifyingContract: minimalForwarderAddr,
    // Just let's you know the latest version. Definitely make sure the field name is correct.
    version: '0.0.1',
  }
  const types = {
    ForwardRequest: [{
      name: 'from',
      type: 'address'
    },
    {
      name: 'to',
      type: 'address'
    },
    {
      name: 'value',
      type: 'uint256'
    },
    {
      name: 'gas',
      type: 'uint256'
    },
    {
      name: 'nonce',
      type: 'uint256'
    },
    {
      name: 'data',
      type: 'bytes'
    },
    ],
  }
  const signature = await wallet._signTypedData(domain, types, req)
  return signature
}