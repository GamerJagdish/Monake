// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MonakeNFT is ERC721, Ownable {
    uint256 private _tokenIds;
    

    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId);
    
    constructor() ERC721("Monake NFT", "MONAKE") Ownable(msg.sender) {}
    
    /**
     * @dev Mints a new NFT to the specified address
     * @param to The address to mint the NFT to
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to) public returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(to, newTokenId);
        
        emit NFTMinted(to, newTokenId);
        return newTokenId;
    }
    

    
    /**
     * @dev Returns the total number of tokens minted
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIds;
    }
    
    /**
     * @dev Returns the next token ID that will be minted
     */
    function nextTokenId() public view returns (uint256) {
        return _tokenIds + 1;
    }
    

    
    /**
     * @dev Burns a token (owner only)
     */
    function burn(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }
    
    /**
     * @dev Returns the token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(ownerOf(tokenId) != address(0), "Token does not exist");

        string memory number = Strings.toString(tokenId);

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Monake OG #',
                        number,
                        '","description": "Start of Monake Journey.", ',
                        '"attributes": [{"trait_type": "Rarity", "value": "OG Mega"}], ',
                        '"image": "ipfs://bafkreihr2qjas5didqsyi6xjaggdtcbznzmjmd5pcaswqja5e754yyrbre"}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
    

}
