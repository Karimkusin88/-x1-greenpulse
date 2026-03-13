// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GreenPulseCarbonCredit
 * @dev Carbon Credit NFT on X1 EcoChain
 * @author KarimKusin (0x71723715478b344164e992b49ae1fCEb6467888B)
 */
contract GreenPulseCarbonCredit {
    string public name = "GreenPulse Carbon Credit";
    string public symbol = "GPCC";
    address public owner;
    uint256 private _tokenIdCounter;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) private _carbonOffsets; // tCO2 per token

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event CarbonCreditMinted(uint256 indexed tokenId, address indexed to, uint256 carbonOffset, string category);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, string memory uri, uint256 carbonOffsetTCO2, string memory category) public returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = uri;
        _carbonOffsets[tokenId] = carbonOffsetTCO2;
        emit Transfer(address(0), to, tokenId);
        emit CarbonCreditMinted(tokenId, to, carbonOffsetTCO2, category);
        return tokenId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _owners[tokenId];
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function carbonOffset(uint256 tokenId) public view returns (uint256) {
        return _carbonOffsets[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        owner = newOwner;
    }
}

/**
 * @title GreenScoreOracle  
 * @dev Track validator Green Scores on X1 EcoChain
 * @author KarimKusin (0x71723715478b344164e992b49ae1fCEb6467888B)
 */
contract GreenScoreOracle {
    address public owner;

    struct ValidatorScore {
        uint256 energyScore;
        uint256 uptimeScore;
        uint256 carbonScore;
        uint256 networkScore;
        uint256 totalScore;
        uint256 lastUpdated;
    }

    mapping(address => ValidatorScore) public scores;
    address[] public validators;

    event ScoreUpdated(address indexed validator, uint256 totalScore);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function updateScore(
        address validator,
        uint256 energy,
        uint256 uptime,
        uint256 carbon,
        uint256 network
    ) public onlyOwner {
        if (scores[validator].lastUpdated == 0) {
            validators.push(validator);
        }
        uint256 total = (energy * 40 + uptime * 30 + carbon * 20 + network * 10) / 100;
        scores[validator] = ValidatorScore(energy, uptime, carbon, network, total, block.timestamp);
        emit ScoreUpdated(validator, total);
    }

    function getScore(address validator) public view returns (uint256) {
        return scores[validator].totalScore;
    }

    function getValidatorCount() public view returns (uint256) {
        return validators.length;
    }
}
