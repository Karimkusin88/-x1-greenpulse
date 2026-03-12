// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GreenScoreOracle
 * @author KarimKusin (0x7172...888B)
 * @notice Oracle contract for tracking and scoring validator energy efficiency
 * @dev Feeds Green Score data to the GreenPulseCarbonCredit contract
 *
 * Green Score Formula:
 *   Score = (EnergyEfficiency * 0.4) + (Uptime * 0.3) + (CarbonSavings * 0.2) + (NetworkContribution * 0.1)
 *
 * Each component is scored 0-100, resulting in a composite score of 0-100.
 */
contract GreenScoreOracle is Ownable {

    // ============================================================
    //                          STORAGE
    // ============================================================

    /// @notice Energy metrics for a validator
    struct EnergyMetrics {
        uint256 energyUsageWh;         // Current energy usage in Wh (1e18 = 1 Wh)
        uint256 uptimePercent;         // Uptime percentage (1e18 = 100%)
        uint256 carbonSavingsTons;     // CO2 savings in tons vs Ethereum equivalent
        uint256 blocksValidated;       // Number of blocks validated
        uint256 totalTransactions;     // Total transactions processed
        uint256 lastReportTimestamp;   // Last time metrics were reported
    }

    /// @notice Score breakdown for transparency
    struct ScoreBreakdown {
        uint256 energyScore;           // 0-100, weight: 40%
        uint256 uptimeScore;           // 0-100, weight: 30%
        uint256 carbonScore;           // 0-100, weight: 20%
        uint256 networkScore;          // 0-100, weight: 10%
        uint256 compositeScore;        // Weighted average 0-100
        uint256 calculatedAt;
    }

    /// @notice Mapping from validator to energy metrics
    mapping(address => EnergyMetrics) public validatorMetrics;

    /// @notice Mapping from validator to score breakdown
    mapping(address => ScoreBreakdown) public validatorScores;

    /// @notice Authorized data reporters (IoT sensors, monitoring agents)
    mapping(address => bool) public authorizedReporters;

    /// @notice Reference energy usage for scoring (3 Wh = X1 standard)
    uint256 public referenceEnergyWh = 3 ether; // 3 * 1e18

    /// @notice Ethereum average energy for comparison (600 Wh)
    uint256 public ethereumReferenceWh = 600 ether;

    /// @notice Minimum reporting interval (1 hour)
    uint256 public minReportInterval = 1 hours;

    // ============================================================
    //                          EVENTS
    // ============================================================

    event MetricsReported(
        address indexed validator,
        uint256 energyUsageWh,
        uint256 uptimePercent,
        uint256 timestamp
    );
    event ScoreCalculated(
        address indexed validator,
        uint256 compositeScore,
        uint256 timestamp
    );
    event ReporterAuthorized(address indexed reporter);
    event ReporterRevoked(address indexed reporter);

    // ============================================================
    //                        CONSTRUCTOR
    // ============================================================

    constructor() Ownable() {
        authorizedReporters[msg.sender] = true;
        emit ReporterAuthorized(msg.sender);
    }

    // ============================================================
    //                    REPORTING FUNCTIONS
    // ============================================================

    /**
     * @notice Report energy metrics for a validator
     * @param _validator Address of the validator
     * @param _energyUsageWh Energy usage in Wh (scaled by 1e18)
     * @param _uptimePercent Uptime percentage (scaled by 1e18, max 100e18)
     * @param _blocksValidated Number of blocks validated since last report
     * @param _transactionsProcessed Number of transactions processed
     */
    function reportMetrics(
        address _validator,
        uint256 _energyUsageWh,
        uint256 _uptimePercent,
        uint256 _blocksValidated,
        uint256 _transactionsProcessed
    ) external {
        require(
            authorizedReporters[msg.sender] || msg.sender == owner(),
            "Not authorized reporter"
        );
        require(_uptimePercent <= 100 ether, "Uptime cannot exceed 100%");
        require(
            block.timestamp >= validatorMetrics[_validator].lastReportTimestamp + minReportInterval,
            "Report too frequent"
        );

        // Calculate carbon savings vs Ethereum equivalent
        uint256 carbonSavings = 0;
        if (ethereumReferenceWh > _energyUsageWh) {
            carbonSavings = ((ethereumReferenceWh - _energyUsageWh) * 1e18) / ethereumReferenceWh;
        }

        validatorMetrics[_validator] = EnergyMetrics({
            energyUsageWh: _energyUsageWh,
            uptimePercent: _uptimePercent,
            carbonSavingsTons: carbonSavings,
            blocksValidated: validatorMetrics[_validator].blocksValidated + _blocksValidated,
            totalTransactions: validatorMetrics[_validator].totalTransactions + _transactionsProcessed,
            lastReportTimestamp: block.timestamp
        });

        emit MetricsReported(_validator, _energyUsageWh, _uptimePercent, block.timestamp);

        // Auto-calculate score
        _calculateScore(_validator);
    }

    // ============================================================
    //                    SCORING FUNCTIONS
    // ============================================================

    /**
     * @dev Internal function to calculate Green Score
     */
    function _calculateScore(address _validator) internal {
        EnergyMetrics memory metrics = validatorMetrics[_validator];

        // Energy Efficiency Score (0-100)
        // Lower energy = higher score. At referenceEnergy (3Wh) = 100
        uint256 energyScore;
        if (metrics.energyUsageWh == 0) {
            energyScore = 100;
        } else if (metrics.energyUsageWh <= referenceEnergyWh) {
            energyScore = 100; // At or below reference = perfect
        } else if (metrics.energyUsageWh >= ethereumReferenceWh) {
            energyScore = 0; // At Ethereum level = zero
        } else {
            // Linear interpolation between reference and Ethereum 
            energyScore = ((ethereumReferenceWh - metrics.energyUsageWh) * 100) / 
                          (ethereumReferenceWh - referenceEnergyWh);
        }

        // Uptime Score (0-100)
        // Direct mapping: 100% uptime = 100 score
        uint256 uptimeScore = metrics.uptimePercent / 1e18;
        if (uptimeScore > 100) uptimeScore = 100;

        // Carbon Savings Score (0-100)
        // Based on carbon savings ratio
        uint256 carbonScore = (metrics.carbonSavingsTons * 100) / 1e18;
        if (carbonScore > 100) carbonScore = 100;

        // Network Contribution Score (0-100)
        // Based on blocks validated (logarithmic scale)
        uint256 networkScore;
        if (metrics.blocksValidated >= 100000) {
            networkScore = 100;
        } else if (metrics.blocksValidated >= 10000) {
            networkScore = 80;
        } else if (metrics.blocksValidated >= 1000) {
            networkScore = 60;
        } else if (metrics.blocksValidated >= 100) {
            networkScore = 40;
        } else if (metrics.blocksValidated >= 10) {
            networkScore = 20;
        } else {
            networkScore = (metrics.blocksValidated * 20) / 10;
        }

        // Composite Score: weighted average
        // Energy: 40%, Uptime: 30%, Carbon: 20%, Network: 10%
        uint256 compositeScore = 
            (energyScore * 40 + uptimeScore * 30 + carbonScore * 20 + networkScore * 10) / 100;

        validatorScores[_validator] = ScoreBreakdown({
            energyScore: energyScore,
            uptimeScore: uptimeScore,
            carbonScore: carbonScore,
            networkScore: networkScore,
            compositeScore: compositeScore,
            calculatedAt: block.timestamp
        });

        emit ScoreCalculated(_validator, compositeScore, block.timestamp);
    }

    // ============================================================
    //                      VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get current Green Score for a validator
     */
    function getGreenScore(address _validator) external view returns (uint256) {
        return validatorScores[_validator].compositeScore;
    }

    /**
     * @notice Get full score breakdown
     */
    function getScoreBreakdown(address _validator) external view returns (ScoreBreakdown memory) {
        return validatorScores[_validator];
    }

    /**
     * @notice Get energy metrics
     */
    function getEnergyMetrics(address _validator) external view returns (EnergyMetrics memory) {
        return validatorMetrics[_validator];
    }

    // ============================================================
    //                      ADMIN FUNCTIONS
    // ============================================================

    function authorizeReporter(address _reporter) external onlyOwner {
        authorizedReporters[_reporter] = true;
        emit ReporterAuthorized(_reporter);
    }

    function revokeReporter(address _reporter) external onlyOwner {
        authorizedReporters[_reporter] = false;
        emit ReporterRevoked(_reporter);
    }

    function setReferenceEnergy(uint256 _referenceWh) external onlyOwner {
        referenceEnergyWh = _referenceWh;
    }

    function setMinReportInterval(uint256 _interval) external onlyOwner {
        minReportInterval = _interval;
    }
}
