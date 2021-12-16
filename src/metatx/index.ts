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
  const provider = wallet.provider
  if (!provider) throw Error('SignForwardRequest got error: signer needs provider')
  const msgParams = {
    domain: {
      // Defining the chain aka Rinkeby testnet or Ethereum Main Net
      chainId: (await provider.getNetwork()).chainId,
      // Give a user friendly name to the specific contract you are signing for.
      name: 'MinimalForwarder',
      // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
      verifyingContract: minimalForwarderAddr,
      // Just let's you know the latest version. Definitely make sure the field name is correct.
      version: '0.0.1',
    },

    // Defining the message signing data content.
    message: req,
    // Refers to the keys of the *types* object below.
    primaryType: 'ForwardRequest',
    types: {
      // TODO: Clarify if EIP712Domain refers to the domain the contract is hosted on
      EIP712Domain: [{
          name: 'name',
          type: 'string'
        },
        {
          name: 'version',
          type: 'string'
        },
        {
          name: 'chainId',
          type: 'uint256'
        },
        {
          name: 'verifyingContract',
          type: 'address'
        },
      ],
      // Refer to PrimaryType
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
    },
  }
  const signature = await wallet._signTypedData(msgParams.domain, msgParams.types, msgParams.message)
  return signature
}