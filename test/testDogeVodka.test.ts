import {expect} from './chai-setup';
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {setupUsers} from './utils';
import {DogeVodka} from '../typechain/DogeVodka';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('DogeVodka');
  const contracts = {
    DogeVodka: <DogeVodka>await ethers.getContract('DogeVodka'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
  };
});

const dogeVodkaPrice = 69420000000000000;

describe('DogeVodka', function () {
  it('should buy/mint 1 nft', async function () {
    const {users, DogeVodka} = await setup();

    await expect(users[0].DogeVodka.mint(1, {value: dogeVodkaPrice.toString()}))
      .to.emit(DogeVodka, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        1
      );
  });

  it('should buy/mint 5 nfts', async function () {
    const {users, DogeVodka} = await setup();

    await expect(
      users[0].DogeVodka.mint(5, {value: (dogeVodkaPrice * 5).toString()})
    )
      .to.emit(DogeVodka, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        1
      );
  });

  it('should revert mint attempt with lower price', async function () {
    const {users} = await setup();

    await expect(
      users[0].DogeVodka.mint(5, {value: (dogeVodkaPrice - 1).toString()})
    ).to.be.revertedWith('Ether value sent is not correct');
  });

  it('should revert mint attempt with higher price', async function () {
    const {users} = await setup();

    await expect(
      users[0].DogeVodka.mint(5, {value: (dogeVodkaPrice + 1).toString()})
    ).to.be.revertedWith('Ether value sent is not correct');
  });

  it('should redeem', async function () {
    const {users, DogeVodka} = await setup();

    await users[0].DogeVodka.mint(1, {value: dogeVodkaPrice.toString()});

    await expect(DogeVodka.redeem(['1'])).to.emit(DogeVodka, 'Redeemed');
  });

  it('should redeem multiple tokens', async function () {
    const {users, DogeVodka} = await setup();

    await users[0].DogeVodka.mint(5, {value: (dogeVodkaPrice * 5).toString()});

    await expect(DogeVodka.redeem(['1', '2', '3', '4', '5'])).to.emit(
      DogeVodka,
      'Redeemed'
    );
  });

  it('should return redeemed and non redeemed tokenUris', async function () {
    const {users, DogeVodka} = await setup();

    await users[0].DogeVodka.mint(1, {value: dogeVodkaPrice.toString()});

    await DogeVodka.setBaseURI('ipfs://notRedeemed/');
    await DogeVodka.setRedeemedBaseURI('ipfs://redeemed/');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://notRedeemed/1');

    await expect(DogeVodka.redeem(['1'])).to.emit(DogeVodka, 'Redeemed');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://redeemed/1');
  });
});
