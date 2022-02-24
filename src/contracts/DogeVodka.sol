// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract DogeVodka is ERC721Enumerable, Ownable {
    using MerkleProof for bytes32[];
    using Strings for uint256;

    string private baseURI;
    string private redeemedBaseURI;

    mapping(uint256 => bool) public redeemedToken;

    constructor() ERC721("Doge Vodka Test", "TDV") {}

    bool public saleStarted = true;
    uint256 public constant vodkaPrice = 69420000000000000; //0.069420 ETH
    uint256 public constant maxVodkas = 2013;
    uint8 public constant maxVodkasPurchase = 5;

    bytes32 public merkleRoot;
    mapping(address => uint16) public alreadyMinted;

    event Redeemed(uint256[] _tokenIds);

    bool public publicSaleStarted = false;

    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }

    function setRedeemedBaseURI(string memory _redeemedBaseURI) public onlyOwner {
        redeemedBaseURI = _redeemedBaseURI;
    }

    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
    }

    function mint(
        bytes32[] memory proof,
        bytes32 leaf,
        uint16 numberOfTokens
    ) public payable {
        require(saleStarted == true, "The sale is paused");
        if (publicSaleStarted == false) {
            require(keccak256(abi.encodePacked(msg.sender)) == leaf, "This leaf does not belong to the sender");
            require(proof.verify(merkleRoot, leaf), "You are not in the list");
            alreadyMinted[msg.sender] += numberOfTokens;
            require(alreadyMinted[msg.sender] < 3, "Already minted private sale");
        }
        require(numberOfTokens <= maxVodkasPurchase, "Can only mint 5 tokens at a time");
        require(totalSupply() + numberOfTokens <= maxVodkas, "Purchase would exceed max supply of Doge Vodkas");
        require(vodkaPrice * numberOfTokens == msg.value, "Ether value sent is not correct");

        for (uint8 i = 0; i < numberOfTokens; i++) _safeMint(msg.sender, totalSupply() + 1);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        if (redeemedToken[tokenId] == true) return string(abi.encodePacked(redeemedBaseURI, tokenId.toString()));
        else return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function redeem(uint256[] memory tokenIds) public onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) redeemedToken[tokenIds[i]] = true;

        emit Redeemed(tokenIds);
    }

    function startSale() public onlyOwner {
        saleStarted = true;
    }

    function pauseSale() public onlyOwner {
        saleStarted = false;
    }

    function togglePublicSale() public onlyOwner {
        publicSaleStarted = !publicSaleStarted;
    }

    function withdraw() public payable onlyOwner {
        require(payable(msg.sender).send(address(this).balance), "Whatchu doing here?");
    }
}
