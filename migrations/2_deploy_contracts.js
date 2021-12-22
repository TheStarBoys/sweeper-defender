const MetaTx = artifacts.require('MetaTx')
const SweeperDefender = artifacts.require('SweeperDefender')

const { toWei, fromWei } = web3.utils

const fs = require('fs')

const BLOCKS_PER_DAY_FOR_TEST = 24 * 60 * 60 / 3 / 3
const BLOCKS_PER_DAY = 24 * 60 * 60 / 3

module.exports = async (deployer, network) => {
    console.log(">>>>> network: ", network)
    await deploy(deployer, network)
}

let deployedContracts = {
    metaTx: '',
    defender: '',
    startBlock: 0,
}

const deploy = async (deployer, network) => {
    deployedContracts.startBlock = await web3.eth.getBlockNumber()
    await deployContracts(deployer)

    if (network != 'test' && network != 'development') {
        console.log('deployedContracts: ', deployedContracts)
        
        let obj = JSON.parse(fs.readFileSync('./deployedContracts.json'))
        obj[network] = deployedContracts
        fs.writeFileSync('./deployedContracts.json', JSON.stringify(obj, null, 2))
    }
}

const deployContracts = async (deployer) => {
    await deployer.deploy(MetaTx)
    let metaTx = await MetaTx.deployed()
    deployedContracts.metaTx = metaTx.address

    await deployer.deploy(SweeperDefender, metaTx.address)
    let defender = await SweeperDefender.deployed()
    deployedContracts.defender = defender.address
}
