// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title GreenPulseCarbonCredit
 * @author KarimKusin (0x7172...888B)
 * @notice Carbon Credit NFT contract for X1 GreenPulse platform
 * @dev ERC-721 NFT representing verified carbon offset certificates on X1 EcoChain
 * 
 * Each NFT represents a verified carbon offset from renewable energy projects.
 * Validators with high Green Scores can mint credits based on their energy savings.
 *
 * Built on X1 EcoChain — The world's most energy-efficient Layer-1
 * Grant Program: https://grant.x1ecochain.com/
 */
contract GreenPulseCarbonCredit is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    // ============================================================
    //                          STORAGE
    // ============================================================

    Counters.Counter private _tokenIdCounter;

    /// @notice Categories of carbon credits
    enum CreditCategory {
        FOREST,         // Reforestation & Forest Preservation
        SOLAR,          // Solar Energy Projects
        WIND,           // Wind Energy Projects
        OCEAN,          // Ocean Cleanup & Marine Restoration
        DEPIN_NODE      // DePIN Node Energy Savings
    }

    /// @notice Verification status of a carbon credit
    enum VerificationStatus {
        PENDING,
        VERIFIED,
        EXPIRED,
        REVOKED
    }

    /// @notice Carbon credit metadata
    struct CarbonCredit {
        uint256 tokenId;
        CreditCategory category;
        VerificationStatus status;
        uint256 co2OffsetTons;      // CO2 offset in tons (scaled by 1e18)
        uint256 mintedAt;
        uint256 expiresAt;
        address verifier;
        string projectName;
        string projectLocation;
        uint256 greenScore;          // Green Score of the minter (0-100)
    }

    /// @notice Validator/Node operator profile
    struct ValidatorProfile {
        address wallet;
        uint256 greenScore;          // Current Green Score (0-100)
        uint256 energyUsageWh;       // Energy usage in Watt-hours (scaled by 1e18)
        uint256 totalCO2Offset;      // Total CO2 offset across all credits
        uint256 creditsEarned;       // Number of credits minted
        uint256 lastUpdated;
        bool isRegistered;
    }

    /// @notice Mapping from token ID to carbon credit data
    mapping(uint256 => CarbonCredit) public carbonCredits;

    /// @notice Mapping from address to validator profile
    mapping(address => ValidatorProfile) public validators;

    /// @notice Authorized verifiers who can verify carbon credits
    mapping(address => bool) public authorizedVerifiers;

    /// @notice Platform statistics
    uint256 public totalCO2Offset;
    uint256 public totalCreditsIssued;
    uint256 public totalValidators;

    /// @notice Minimum Green Score required to mint carbon credits
    uint256 public minGreenScoreToMint = 60;

    /// @notice Credit expiry duration (default: 365 days)
    uint256 public creditExpiryDuration = 365 days;

    /// @notice Mint price in native token (X1)
    uint256 public mintPrice = 0.01 ether;

    // ============================================================
    //                          EVENTS
    // ============================================================

    event ValidatorRegistered(address indexed wallet, uint256 timestamp);
    event GreenScoreUpdated(address indexed validator, uint256 oldScore, uint256 newScore);
    event CarbonCreditMinted(
        uint256 indexed tokenId,
        address indexed minter,
        CreditCategory category,
        uint256 co2OffsetTons,
        string projectName
    );
    event CreditVerified(uint256 indexed tokenId, address indexed verifier);
    event CreditRevoked(uint256 indexed tokenId, string reason);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    constructor() ERC721("GreenPulse Carbon Credit", "GPCC") Ownable() {
        // Register deployer as first verifier
        authorizedVerifiers[msg.sender] = true;
        emit VerifierAdded(msg.sender);
    }

    // ============================================================
    //                     VALIDATOR FUNCTIONS
    // ============================================================

    /**
     * @notice Register as a validator/node operator
     */
    function registerValidator() external {
        require(!validators[msg.sender].isRegistered, "Already registered");

        validators[msg.sender] = ValidatorProfile({
            wallet: msg.sender,
            greenScore: 0,
            energyUsageWh: 3 ether, // Default 3 Wh (X1 standard)
            totalCO2Offset: 0,
            creditsEarned: 0,
            lastUpdated: block.timestamp,
            isRegistered: true
        });

        totalValidators++;
        emit ValidatorRegistered(msg.sender, block.timestamp);
    }

    /**
     * @notice Update a validator's Green Score (only owner or authorized verifier)
     * @param _validator Address of the validator
     * @param _newScore New Green Score (0-100)
     * @param _energyUsageWh Updated energy usage in Wh
     */
    function updateGreenScore(
        address _validator,
        uint256 _newScore,
        uint256 _energyUsageWh
    ) external {
        require(
            msg.sender == owner() || authorizedVerifiers[msg.sender],
            "Not authorized"
        );
        require(validators[_validator].isRegistered, "Validator not registered");
        require(_newScore <= 100, "Score must be 0-100");

        uint256 oldScore = validators[_validator].greenScore;
        validators[_validator].greenScore = _newScore;
        validators[_validator].energyUsageWh = _energyUsageWh;
        validators[_validator].lastUpdated = block.timestamp;

        emit GreenScoreUpdated(_validator, oldScore, _newScore);
    }

    // ============================================================
    //                     MINTING FUNCTIONS
    // ============================================================

    /**
     * @notice Mint a Carbon Credit NFT
     * @param _category Category of the carbon credit
     * @param _co2OffsetTons Amount of CO2 offset in tons (1e18 = 1 ton)
     * @param _projectName Name of the carbon offset project
     * @param _projectLocation Location of the project
     * @param _tokenURI Metadata URI for the NFT
     */
    function mintCarbonCredit(
        CreditCategory _category,
        uint256 _co2OffsetTons,
        string memory _projectName,
        string memory _projectLocation,
        string memory _tokenURI
    ) external payable returns (uint256) {
        require(validators[msg.sender].isRegistered, "Must be registered validator");
        require(
            validators[msg.sender].greenScore >= minGreenScoreToMint,
            "Green Score too low"
        );
        require(_co2OffsetTons > 0, "CO2 offset must be positive");
        require(msg.value >= mintPrice, "Insufficient payment");

        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);

        carbonCredits[newTokenId] = CarbonCredit({
            tokenId: newTokenId,
            category: _category,
            status: VerificationStatus.PENDING,
            co2OffsetTons: _co2OffsetTons,
            mintedAt: block.timestamp,
            expiresAt: block.timestamp + creditExpiryDuration,
            verifier: address(0),
            projectName: _projectName,
            projectLocation: _projectLocation,
            greenScore: validators[msg.sender].greenScore
        });

        // Update validator stats
        validators[msg.sender].totalCO2Offset += _co2OffsetTons;
        validators[msg.sender].creditsEarned++;

        // Update global stats
        totalCO2Offset += _co2OffsetTons;
        totalCreditsIssued++;

        emit CarbonCreditMinted(
            newTokenId,
            msg.sender,
            _category,
            _co2OffsetTons,
            _projectName
        );

        return newTokenId;
    }

    // ============================================================
    //                   VERIFICATION FUNCTIONS
    // ============================================================

    /**
     * @notice Verify a carbon credit (only authorized verifiers)
     * @param _tokenId Token ID to verify
     */
    function verifyCarbonCredit(uint256 _tokenId) external {
        require(authorizedVerifiers[msg.sender], "Not authorized verifier");
        require(_exists(_tokenId), "Token does not exist");
        require(
            carbonCredits[_tokenId].status == VerificationStatus.PENDING,
            "Not pending verification"
        );

        carbonCredits[_tokenId].status = VerificationStatus.VERIFIED;
        carbonCredits[_tokenId].verifier = msg.sender;

        emit CreditVerified(_tokenId, msg.sender);
    }

    /**
     * @notice Revoke a carbon credit (only owner)
     * @param _tokenId Token ID to revoke
     * @param _reason Reason for revocation
     */
    function revokeCarbonCredit(uint256 _tokenId, string memory _reason) external onlyOwner {
        require(_exists(_tokenId), "Token does not exist");
        carbonCredits[_tokenId].status = VerificationStatus.REVOKED;
        emit CreditRevoked(_tokenId, _reason);
    }

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Add an authorized verifier
     */
    function addVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }

    /**
     * @notice Remove an authorized verifier
     */
    function removeVerifier(address _verifier) external onlyOwner {
        authorizedVerifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }

    /**
     * @notice Update minimum Green Score required to mint
     */
    function setMinGreenScore(uint256 _minScore) external onlyOwner {
        require(_minScore <= 100, "Score must be 0-100");
        minGreenScoreToMint = _minScore;
    }

    /**
     * @notice Update mint price
     */
    function setMintPrice(uint256 _price) external onlyOwner {
        mintPrice = _price;
    }

    /**
     * @notice Update credit expiry duration
     */
    function setCreditExpiryDuration(uint256 _duration) external onlyOwner {
        creditExpiryDuration = _duration;
    }

    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get full carbon credit details
     */
    function getCarbonCredit(uint256 _tokenId) external view returns (CarbonCredit memory) {
        require(_exists(_tokenId), "Token does not exist");
        return carbonCredits[_tokenId];
    }

    /**
     * @notice Get validator profile
     */
    function getValidatorProfile(address _validator) external view returns (ValidatorProfile memory) {
        require(validators[_validator].isRegistered, "Not registered");
        return validators[_validator];
    }

    /**
     * @notice Check if a credit has expired
     */
    function isCreditExpired(uint256 _tokenId) external view returns (bool) {
        require(_exists(_tokenId), "Token does not exist");
        return block.timestamp > carbonCredits[_tokenId].expiresAt;
    }

    /**
     * @notice Get platform statistics
     */
    function getPlatformStats() external view returns (
        uint256 _totalCO2Offset,
        uint256 _totalCreditsIssued,
        uint256 _totalValidators,
        uint256 _contractBalance
    ) {
        return (totalCO2Offset, totalCreditsIssued, totalValidators, address(this).balance);
    }

    /**
     * @notice Get all token IDs owned by an address
     */
    function getTokensByOwner(address _owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    // ============================================================
    //                      OVERRIDES
    // ============================================================

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
