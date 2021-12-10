import React from 'react';
import { Web3ReactProvider } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'

import Home from './Home'
import logo from './logo.svg';
import './App.css';

function App() {
  return (
    <Web3ReactProvider getLibrary={(provider, connector) => {
      return new Web3Provider(
        provider,
        typeof provider.chainId === 'number'
          ? provider.chainId
          : typeof provider.chainId === 'string'
          ? parseInt(provider.chainId)
          : 'any'
      )
    }}>
      <Home></Home>
    </Web3ReactProvider>
  );
}

export default App;
