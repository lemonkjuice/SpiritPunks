import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {DogeVodka} from '../typechain/DogeVodka';
// import {parseEther} from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('DogeVodka', {
    from: deployer,
    log: true,
  });

  const erc721: DogeVodka = await ethers.getContract('DogeVodka');
};
export default func;
func.tags = ['DogeVodka'];
