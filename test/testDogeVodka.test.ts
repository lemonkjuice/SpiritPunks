import { expect } from './chai-setup';
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import { setupUsers } from './utils';
import { DogeVodka } from '../typechain/DogeVodka';
import { Bytes } from '@ethersproject/bytes';
import { MerkleTree } from 'merkletreejs';
import { keccak256, toBuffer } from 'ethereumjs-util';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('DogeVodka');
  const contracts = {
    DogeVodka: <DogeVodka>await ethers.getContract('DogeVodka'),
  };

  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  const leaves = users.slice(0, 4).map((x) => keccak256(toBuffer(x.address)));

  const tree = new MerkleTree(leaves, keccak256, {
    sortLeaves: true,
    sortPairs: true,
  });


  await contracts.DogeVodka.setMerkleRoot(tree.getRoot());
  await contracts.DogeVodka.startSale();

  return {
    ...contracts,
    users,
    tree
  };
});

const vodkaPrice = 69420000000000000;

const emptyBytes32Array: Bytes[] = [];
const dummyBytes32 =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

describe('DogeVodka', function () {
  it('should buy/mint 1 nft', async function () {
    const { tree, users, DogeVodka } = await setup();

    const leaf = '0x' + keccak256(toBuffer(users[0].address)).toString('hex');
    const proof = tree.getHexProof(leaf);

    await expect(users[0].DogeVodka.mint(proof, leaf, 1, { value: vodkaPrice.toString() }))
      .to.emit(DogeVodka, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        1
      );
  });

  it('should buy/mint 5 nfts', async function () {
    const { users, DogeVodka } = await setup();

    await DogeVodka.togglePublicSale()

    await expect(
      users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 5, { value: (vodkaPrice * 5).toString() })
    )
      .to.emit(DogeVodka, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        1
      );
  });

  it('should revert mint attempt with lower price', async function () {
    const { users, DogeVodka } = await setup();

    await DogeVodka.togglePublicSale()

    await expect(
      users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 5, { value: (vodkaPrice - 1).toString() })
    ).to.be.revertedWith('Ether value sent is not correct');
  });

  it('should revert mint attempt with higher price', async function () {
    const { users, DogeVodka } = await setup();
    await DogeVodka.togglePublicSale()

    await expect(
      users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 5, { value: (vodkaPrice + 1).toString() })
    ).to.be.revertedWith('Ether value sent is not correct');
  });

  it('should redeem', async function () {
    const { users, DogeVodka } = await setup();
    await DogeVodka.togglePublicSale()

    await users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 1, { value: vodkaPrice.toString() });

    await expect(DogeVodka.redeem(['1'])).to.emit(DogeVodka, 'Redeemed');
  });

  it('should redeem multiple tokens', async function () {
    const { users, DogeVodka } = await setup();
    await DogeVodka.togglePublicSale()

    await users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 5, { value: (vodkaPrice * 5).toString() });

    await expect(DogeVodka.redeem(['1', '2', '3', '4', '5'])).to.emit(
      DogeVodka,
      'Redeemed'
    );
  });

  it('should return redeemed and non redeemed tokenUris', async function () {
    const { users, DogeVodka } = await setup();
    await DogeVodka.togglePublicSale()

    await users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 1, { value: vodkaPrice.toString() });

    await DogeVodka.setBaseURI('ipfs://notRedeemed/');
    await DogeVodka.setRedeemedBaseURI('ipfs://redeemed/');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://notRedeemed/1');

    await expect(DogeVodka.redeem(['1'])).to.emit(DogeVodka, 'Redeemed');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://redeemed/1');
  });

  it('should be able to withdraw', async function () {
    const { users, DogeVodka } = await setup();
    await DogeVodka.togglePublicSale()

    await users[0].DogeVodka.mint(emptyBytes32Array, dummyBytes32, 1, { value: vodkaPrice.toString() });

    await DogeVodka.setBaseURI('ipfs://notRedeemed/');
    await DogeVodka.setRedeemedBaseURI('ipfs://redeemed/');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://notRedeemed/1');

    await expect(DogeVodka.redeem(['1'])).to.emit(DogeVodka, 'Redeemed');

    await expect(await DogeVodka.tokenURI(1)).to.equal('ipfs://redeemed/1');
  });
});
