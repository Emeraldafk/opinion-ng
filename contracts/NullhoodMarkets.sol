// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TiredFunMarkets (v3 — Hybrid Opinion & Prediction Market Engine)
 * @notice Native hybrid market platform on Robinhood Chain (Chain ID 46630).
 *         Supports two distinct market types:
 *         1. PERPETUAL OPINION MARKETS (Type 0):
 *            - Continuous 24/7 conviction trading on independent constant-product bonding curves.
 *            - No expiry date and no mandatory resolution.
 *         2. RESOLVABLE PREDICTION MARKETS (Type 1):
 *            - Time-governed trading halting strictly at `closingTime`.
 *            - Objective YES/NO criteria with approved evidence source.
 *            - Evidence-based resolution lifecycle: ACTIVE -> CLOSED -> PROPOSED -> DISPUTED -> RESOLVED/VOID.
 *            - Mathematically solvent Pari-Mutuel settlement distribution of actual real ETH reserves.
 *            - Zero-winner fallback to VOID refunds to prevent trapped capital.
 *            - 0% commission on settlement claims (1% creator fee earned exclusively on trading volume).
 *         - Strict virtual reserve isolation ($E_v = 0.5$ ETH, $S_v = 500,000$ shares; never withdrawable).
 *         - O(1) global solvency invariant enforced on every buy, sell, claim, and refund.
 */
contract NullhoodMarkets {
    // -------------------------------------------------------------------------
    // Constants & Curve Parameters
    // -------------------------------------------------------------------------
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant CREATOR_FEE_BPS = 100; // 1.00% creator fee on trading volume
    uint256 public constant PROTOCOL_FEE_BPS = 100; // 1.00% protocol fee on trading volume
    uint256 public constant MAX_TOTAL_FEE_BPS = 500; // 5.00% hard cap

    uint256 public constant MIN_TRADE_ETH = 0.0001 ether; // Anti-dust minimum trade guard
    uint256 public constant MAX_STRING_LENGTH = 512;
    uint256 public constant CREATOR_SEED_LOCK_PERIOD = 30 minutes; // Anti-rug lock on initial creator seed

    // Virtual reserves per side: 0.5 ETH virtual, 500,000 virtual shares
    // Genesis spot price: 0.5 / 500,000 = 0.000001 ETH (1e12 wei)
    uint256 public constant INITIAL_VIRTUAL_ETH = 0.5 ether;
    uint256 public constant INITIAL_VIRTUAL_SHARES = 500_000 * 1e18;
    uint256 public constant CURVE_INVARIANT_K = INITIAL_VIRTUAL_ETH * INITIAL_VIRTUAL_SHARES;

    // -------------------------------------------------------------------------
    // Enums & Structs
    // -------------------------------------------------------------------------
    enum MarketType {
        PERPETUAL_OPINION,       // 0: Indefinite sentiment, no closing date or resolution
        RESOLVABLE_PREDICTION     // 1: Closes at closingTime, resolves via evidence, settles
    }

    enum MarketStatus {
        ACTIVE,                  // 0: Trading open
        CLOSED,                  // 1: Trading halted (time reached), awaiting resolution proposal
        PROPOSED,                // 2: Outcome proposed, challenge window open
        DISPUTED,                // 3: Challenged with counter-evidence, awaiting adjudication
        RESOLVED,                // 4: Finalized YES or NO, winner settlement claimable
        VOID                     // 5: Cancelled/invalid, proportional refund claimable
    }

    enum Outcome {
        UNRESOLVED,              // 0
        YES,                     // 1
        NO,                      // 2
        VOID                     // 3
    }

    struct SideCurve {
        uint256 virtualEth;     // Virtual ETH reserve (strictly INITIAL_VIRTUAL_ETH + realEth)
        uint256 virtualShares;  // Virtual share pool (strictly INITIAL_VIRTUAL_SHARES - totalShares)
        uint256 realEth;        // Actual withdrawable ETH collateral locked in this side
        uint256 totalShares;    // Circulating shares held by traders
        uint256 volumeEth;      // Cumulative ETH volume traded on this side
    }

    struct PredictionDetails {
        uint256 closingTime;           // Timestamp when trading halts strictly (UTC)
        uint256 resolutionDeadline;    // Timestamp when outcome must be proposed
        uint256 disputeDeadline;       // Timestamp when dispute challenge window closes
        string yesCondition;           // Objective YES condition
        string noCondition;            // Objective NO condition
        string evidenceSource;         // URL or oracle specification
        string proposedEvidence;       // Evidence notes/link from proposer
        string disputeEvidence;        // Counter-evidence notes/link from challenger
        address proposer;              // Address that submitted outcome proposal
        address disputer;              // Address that submitted dispute challenge
        uint256 proposedAt;            // Timestamp of outcome proposal
        uint256 disputedAt;            // Timestamp of dispute challenge
        uint256 resolvedAt;            // Timestamp of final resolution
        Outcome proposedOutcome;       // Outcome currently proposed
        Outcome finalOutcome;          // Final adjudicated outcome
        uint256 distributablePool;     // Frozen total real ETH at resolution (YES realEth + NO realEth)
        uint256 winningTotalShares;    // Total shares of winning outcome at resolution
        uint256 totalClaimedSettlement;// Total ETH paid out in claims
    }

    struct Market {
        uint256 id;
        address creator;
        string question;
        string category;
        string imageUri;
        string sourceHandle;
        uint256 createdAt;
        uint256 totalTrades;
        uint256 creatorFeesEarned;
        SideCurve yesCurve;
        SideCurve noCurve;
        MarketType marketType;         // PERPETUAL_OPINION vs RESOLVABLE_PREDICTION
        MarketStatus status;           // ACTIVE, CLOSED, PROPOSED, DISPUTED, RESOLVED, VOID
        PredictionDetails prediction;
    }

    struct MarketAnalytics {
        uint256 yesBuyVolumeEth;
        uint256 yesSellVolumeEth;
        uint256 noBuyVolumeEth;
        uint256 noSellVolumeEth;
        uint256 yesTrades;
        uint256 noTrades;
        uint256 uniqueTraders;
        uint256 peakYesPriceWei;
        uint256 peakNoPriceWei;
        uint256 lastTradeAt;
    }

    struct MarketSummary {
        uint256 id;
        address creator;
        string question;
        string category;
        string imageUri;
        string sourceHandle;
        uint256 createdAt;
        uint256 totalTrades;
        uint256 creatorFeesEarned;
        uint256 yesRealEth;
        uint256 noRealEth;
        uint256 yesTotalShares;
        uint256 noTotalShares;
        uint256 yesVolumeEth;
        uint256 noVolumeEth;
        uint256 yesPriceWei;
        uint256 noPriceWei;
        uint256 yesSentimentBps;        // 0 to 10000 (5000 = 50.00% YES)
        MarketType marketType;          // 0 = Opinion, 1 = Prediction
        MarketStatus status;            // 0 = Active, 1 = Closed, etc.
        uint256 closingTime;
        uint256 resolutionDeadline;
        Outcome finalOutcome;
        uint256 distributablePool;
        uint256 winningTotalShares;
        string evidenceSource;
    }

    struct UserPosition {
        uint256 marketId;
        uint256 yesShares;
        uint256 noShares;
        uint256 yesValueEth;
        uint256 noValueEth;
        bool hasClaimedSettlement;
        uint256 claimableSettlementEth;
    }

    struct UserOnChainStats {
        uint256 marketsCreated;
        uint256 totalTrades;
        uint256 totalVolumeWei;
        uint256 uniqueMarketsTraded;
        uint256 creatorVolumeGeneratedWei;
        uint256 claimableCreatorFeesWei;
        uint256 lifetimeCreatorFeesWei;
        uint256 totalCreatorFeesClaimedWei;
        uint256 creatorClaimCount;
    }

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    address public owner;
    address public pendingOwner;
    bool public paused;

    uint256 public creatorFeeBps = CREATOR_FEE_BPS;
    uint256 public protocolFeeBps = PROTOCOL_FEE_BPS;

    // Date governance parameters (configurable by admin)
    uint256 public minTradingDuration = 24 hours;     // 1 day minimum trading duration
    uint256 public maxTradingDuration = 90 days;      // 90 days maximum trading duration
    uint256 public maxResolutionGracePeriod = 30 days;// Maximum window for proposal after close
    uint256 public disputeWindowDuration = 24 hours;  // 24 hours dispute challenge period

    uint256 public marketCount;
    uint256 public totalRealEthLocked;
    uint256 public totalClaimableCreatorFees;
    uint256 public protocolFeesAccrued;

    mapping(uint256 => Market) internal _markets;
    mapping(uint256 => MarketAnalytics) internal _analytics;
    mapping(uint256 => mapping(address => bool)) public hasTradedMarket;

    // marketId => user => shares
    mapping(uint256 => mapping(address => uint256)) public yesBalances;
    mapping(uint256 => mapping(address => uint256)) public noBalances;

    // marketId => user => claimed settlement reward
    mapping(uint256 => mapping(address => bool)) public hasClaimedSettlement;

    // Authorized resolvers (admin or designated resolver addresses)
    mapping(address => bool) public isAuthorizedResolver;

    // Creator fee ledger
    mapping(address => uint256) public claimableCreatorFees;
    mapping(address => uint256) public lifetimeCreatorFees;
    mapping(address => uint256) public claimedCreatorFees;
    mapping(address => uint256) public creatorClaimCount;
    mapping(uint256 => uint256) public creatorSeedLockUntil;

    // User participation analytics
    mapping(address => uint256) public userMarketsCreated;
    mapping(address => uint256) public userTotalTrades;
    mapping(address => uint256) public userTotalVolumeWei;
    mapping(address => uint256) public userUniqueMarketsTraded;
    mapping(address => uint256) public creatorVolumeGeneratedWei;

    uint256 private _unlocked = 1;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        string category,
        MarketType marketType,
        uint256 closingTime,
        uint256 timestamp
    );

    event OpinionTraded(
        uint256 indexed marketId,
        address indexed trader,
        bool isYes,
        bool isBuy,
        uint256 ethAmount,
        uint256 shareAmount,
        uint256 newYesPriceWei,
        uint256 newNoPriceWei,
        uint256 yesSentimentBps,
        uint256 timestamp
    );

    event OutcomeProposed(
        uint256 indexed marketId,
        Outcome proposedOutcome,
        address indexed proposer,
        string evidenceUrl,
        uint256 disputeDeadline
    );

    event OutcomeDisputed(
        uint256 indexed marketId,
        Outcome challengedOutcome,
        address indexed disputer,
        string counterEvidenceUrl
    );

    event MarketResolved(
        uint256 indexed marketId,
        Outcome finalOutcome,
        uint256 distributablePool,
        uint256 winningTotalShares,
        string adjudicationEvidence
    );

    event SettlementClaimed(
        uint256 indexed marketId,
        address indexed recipient,
        uint256 rewardEth,
        uint256 sharesBurned
    );

    event VoidRefundClaimed(
        uint256 indexed marketId,
        address indexed recipient,
        uint256 refundEth
    );

    event CreatorFeesClaimed(address indexed creator, uint256 amount, uint256 claimIndex, uint256 timestamp);
    event ProtocolFeesClaimed(address indexed recipient, uint256 amount, uint256 timestamp);
    event FeeConfigurationUpdated(uint256 creatorFeeBps, uint256 protocolFeeBps);
    event DateGovernanceUpdated(uint256 minTradingDuration, uint256 maxTradingDuration, uint256 disputeWindowDuration);
    event ResolverAuthorizationUpdated(address indexed resolver, bool isAuthorized);
    event PausedStateChanged(bool isPaused, address indexed triggeredBy);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------
    error ReentrancyGuard();
    error ContractPaused();
    error InvalidMarket();
    error EmptyQuestion();
    error StringTooLong();
    error ZeroAmount();
    error TradeBelowMinimum(uint256 provided, uint256 minimum);
    error InsufficientShares();
    error CreatorSeedLocked(uint256 unlockTimestamp);
    error SlippageExceeded();
    error InvalidFeeConfiguration();
    error SolvencyInvariantViolated();
    error TransferFailed();
    error Unauthorized();
    error ZeroAddress();
    error TradingClosed();
    error InvalidDates();
    error MarketNotResolvable();
    error InvalidMarketStatus();
    error ChallengePeriodActive();
    error ChallengePeriodExpired();
    error AlreadyClaimed();
    error NoWinningShares();
    error CreatorCannotResolveOwnMarket();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier nonReentrant() {
        if (_unlocked != 1) revert ReentrancyGuard();
        _unlocked = 2;
        _;
        _unlocked = 1;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyResolver() {
        if (msg.sender != owner && !isAuthorizedResolver[msg.sender]) revert Unauthorized();
        _;
    }

    modifier validMarket(uint256 marketId) {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarket();
        _;
    }

    constructor() {
        owner = msg.sender;
        isAuthorizedResolver[msg.sender] = true;
    }

    // -------------------------------------------------------------------------
    // Governance & Security Controls
    // -------------------------------------------------------------------------

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused, msg.sender);
    }

    function setFeeConfiguration(uint256 _creatorFeeBps, uint256 _protocolFeeBps) external onlyOwner {
        if (_creatorFeeBps + _protocolFeeBps > MAX_TOTAL_FEE_BPS) {
            revert InvalidFeeConfiguration();
        }
        creatorFeeBps = _creatorFeeBps;
        protocolFeeBps = _protocolFeeBps;
        emit FeeConfigurationUpdated(_creatorFeeBps, _protocolFeeBps);
    }

    function setDateGovernance(
        uint256 _minTradingDuration,
        uint256 _maxTradingDuration,
        uint256 _disputeWindowDuration
    ) external onlyOwner {
        if (_minTradingDuration == 0 || _minTradingDuration > _maxTradingDuration) {
            revert InvalidDates();
        }
        minTradingDuration = _minTradingDuration;
        maxTradingDuration = _maxTradingDuration;
        disputeWindowDuration = _disputeWindowDuration;
        emit DateGovernanceUpdated(_minTradingDuration, _maxTradingDuration, _disputeWindowDuration);
    }

    function setAuthorizedResolver(address resolver, bool authorized) external onlyOwner {
        if (resolver == address(0)) revert ZeroAddress();
        isAuthorizedResolver[resolver] = authorized;
        emit ResolverAuthorizationUpdated(resolver, authorized);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, owner);
    }

    function totalFeeBps() public view returns (uint256) {
        return creatorFeeBps + protocolFeeBps;
    }

    // -------------------------------------------------------------------------
    // Market Creation (Dual Market Types)
    // -------------------------------------------------------------------------

    /**
     * @notice Launch a Perpetual Opinion Market (Type 0).
     *         Never resolves via oracle; continuous perpetual sentiment trading.
     */
    function createMarket(
        string calldata question,
        string calldata category,
        string calldata imageUri,
        string calldata sourceHandle,
        bool initialSideIsYes
    ) external payable nonReentrant whenNotPaused returns (uint256 marketId) {
        marketId = _initMarket(
            question,
            category,
            imageUri,
            sourceHandle,
            MarketType.PERPETUAL_OPINION,
            0,
            0,
            "",
            "",
            ""
        );

        if (msg.value > 0) {
            creatorSeedLockUntil[marketId] = block.timestamp + CREATOR_SEED_LOCK_PERIOD;
            _buy(marketId, msg.sender, initialSideIsYes, msg.value, 0);
        }

        _assertSolvency();
    }

    /**
     * @notice Launch a Resolvable Prediction Market (Type 1).
     *         Requires defined closing date, resolution deadline, YES/NO criteria, and evidence source.
     */
    function createPredictionMarket(
        string calldata question,
        string calldata category,
        string calldata imageUri,
        string calldata sourceHandle,
        uint256 closingTime,
        uint256 resolutionDeadline,
        string calldata yesCondition,
        string calldata noCondition,
        string calldata evidenceSource,
        bool initialSideIsYes
    ) external payable nonReentrant whenNotPaused returns (uint256 marketId) {
        // Enforce date governance
        if (
            closingTime < block.timestamp + minTradingDuration ||
            closingTime > block.timestamp + maxTradingDuration ||
            resolutionDeadline < closingTime ||
            resolutionDeadline > closingTime + maxResolutionGracePeriod
        ) {
            revert InvalidDates();
        }

        if (
            bytes(yesCondition).length == 0 ||
            bytes(noCondition).length == 0 ||
            bytes(evidenceSource).length == 0
        ) {
            revert EmptyQuestion();
        }

        marketId = _initMarket(
            question,
            category,
            imageUri,
            sourceHandle,
            MarketType.RESOLVABLE_PREDICTION,
            closingTime,
            resolutionDeadline,
            yesCondition,
            noCondition,
            evidenceSource
        );

        if (msg.value > 0) {
            creatorSeedLockUntil[marketId] = block.timestamp + CREATOR_SEED_LOCK_PERIOD;
            _buy(marketId, msg.sender, initialSideIsYes, msg.value, 0);
        }

        _assertSolvency();
    }

    function _initMarket(
        string memory question,
        string memory category,
        string memory imageUri,
        string memory sourceHandle,
        MarketType mType,
        uint256 closingTime,
        uint256 resolutionDeadline,
        string memory yesCondition,
        string memory noCondition,
        string memory evidenceSource
    ) internal returns (uint256 marketId) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (
            bytes(question).length > MAX_STRING_LENGTH ||
            bytes(category).length > 64 ||
            bytes(imageUri).length > MAX_STRING_LENGTH ||
            bytes(sourceHandle).length > 128
        ) revert StringTooLong();

        if (msg.value > 0 && msg.value < MIN_TRADE_ETH) {
            revert TradeBelowMinimum(msg.value, MIN_TRADE_ETH);
        }

        marketId = ++marketCount;
        Market storage m = _markets[marketId];
        m.id = marketId;
        m.creator = msg.sender;
        m.question = question;
        m.category = bytes(category).length == 0 ? "Trending" : category;
        m.imageUri = imageUri;
        m.sourceHandle = sourceHandle;
        m.createdAt = block.timestamp;
        m.marketType = mType;
        m.status = MarketStatus.ACTIVE;

        if (mType == MarketType.RESOLVABLE_PREDICTION) {
            m.prediction.closingTime = closingTime;
            m.prediction.resolutionDeadline = resolutionDeadline;
            m.prediction.yesCondition = yesCondition;
            m.prediction.noCondition = noCondition;
            m.prediction.evidenceSource = evidenceSource;
        }

        uint256 genesisPriceWei = (INITIAL_VIRTUAL_ETH * 1e18) / INITIAL_VIRTUAL_SHARES;

        m.yesCurve = SideCurve({
            virtualEth: INITIAL_VIRTUAL_ETH,
            virtualShares: INITIAL_VIRTUAL_SHARES,
            realEth: 0,
            totalShares: 0,
            volumeEth: 0
        });

        m.noCurve = SideCurve({
            virtualEth: INITIAL_VIRTUAL_ETH,
            virtualShares: INITIAL_VIRTUAL_SHARES,
            realEth: 0,
            totalShares: 0,
            volumeEth: 0
        });

        _analytics[marketId] = MarketAnalytics({
            yesBuyVolumeEth: 0,
            yesSellVolumeEth: 0,
            noBuyVolumeEth: 0,
            noSellVolumeEth: 0,
            yesTrades: 0,
            noTrades: 0,
            uniqueTraders: 0,
            peakYesPriceWei: genesisPriceWei,
            peakNoPriceWei: genesisPriceWei,
            lastTradeAt: block.timestamp
        });

        userMarketsCreated[msg.sender] += 1;

        emit MarketCreated(
            marketId,
            msg.sender,
            question,
            m.category,
            mType,
            closingTime,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // Trading (Independent YES and NO Bonding Curves)
    // -------------------------------------------------------------------------

    /**
     * @notice Buy YES or NO shares on a market's bonding curve.
     *         For prediction markets, trading automatically halts when closingTime is reached.
     */
    function buyShares(
        uint256 marketId,
        bool isYes,
        uint256 minSharesOut
    ) external payable nonReentrant whenNotPaused validMarket(marketId) returns (uint256 sharesOut) {
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value < MIN_TRADE_ETH) revert TradeBelowMinimum(msg.value, MIN_TRADE_ETH);

        _checkTradingActive(marketId);

        sharesOut = _buy(marketId, msg.sender, isYes, msg.value, minSharesOut);
        _assertSolvency();
    }

    /**
     * @notice Sell YES or NO shares back into that side's curve for instant ETH liquidity.
     *         Virtual reserves can NEVER be withdrawn; grossEthOut is strictly bounded by realEth.
     */
    function sellShares(
        uint256 marketId,
        bool isYes,
        uint256 sharesIn,
        uint256 minEthOut
    ) external nonReentrant whenNotPaused validMarket(marketId) returns (uint256 netEthOut) {
        if (sharesIn == 0) revert ZeroAmount();

        _checkTradingActive(marketId);

        Market storage m = _markets[marketId];
        if (msg.sender == m.creator && block.timestamp < creatorSeedLockUntil[marketId]) {
            revert CreatorSeedLocked(creatorSeedLockUntil[marketId]);
        }
        uint256 userBal = isYes ? yesBalances[marketId][msg.sender] : noBalances[marketId][msg.sender];
        if (userBal < sharesIn) revert InsufficientShares();

        SideCurve storage curve = isYes ? m.yesCurve : m.noCurve;

        uint256 grossEthOut;
        {
            uint256 newVirtualShares = curve.virtualShares + sharesIn;
            if (newVirtualShares > INITIAL_VIRTUAL_SHARES) {
                newVirtualShares = INITIAL_VIRTUAL_SHARES;
            }

            // Round up newVirtualEth to preserve invariant K in favor of protocol solvency
            uint256 newVirtualEth = (CURVE_INVARIANT_K + newVirtualShares - 1) / newVirtualShares;
            if (newVirtualEth < INITIAL_VIRTUAL_ETH) {
                newVirtualEth = INITIAL_VIRTUAL_ETH;
            }

            grossEthOut = curve.virtualEth > newVirtualEth ? curve.virtualEth - newVirtualEth : 0;
            // Strict virtual reserve isolation: cannot exceed real ETH locked on this side
            if (grossEthOut > curve.realEth) {
                grossEthOut = curve.realEth;
            }
            if (grossEthOut == 0) revert ZeroAmount();
        }

        {
            uint256 creatorFee = (grossEthOut * creatorFeeBps) / BPS_DENOMINATOR;
            uint256 protocolFee = (grossEthOut * protocolFeeBps) / BPS_DENOMINATOR;
            netEthOut = grossEthOut - creatorFee - protocolFee;

            if (netEthOut < minEthOut) revert SlippageExceeded();

            claimableCreatorFees[m.creator] += creatorFee;
            lifetimeCreatorFees[m.creator] += creatorFee;
            totalClaimableCreatorFees += creatorFee;
            m.creatorFeesEarned += creatorFee;
            protocolFeesAccrued += protocolFee;
            m.totalTrades += 1;
        }

        curve.realEth -= grossEthOut;
        curve.virtualEth = INITIAL_VIRTUAL_ETH + curve.realEth;
        curve.totalShares -= sharesIn;
        curve.virtualShares = INITIAL_VIRTUAL_SHARES - curve.totalShares;
        curve.volumeEth += grossEthOut;

        totalRealEthLocked -= grossEthOut;

        if (curve.virtualEth * curve.virtualShares < CURVE_INVARIANT_K) {
            revert SolvencyInvariantViolated();
        }

        if (isYes) {
            yesBalances[marketId][msg.sender] = userBal - sharesIn;
        } else {
            noBalances[marketId][msg.sender] = userBal - sharesIn;
        }

        _recordTradeAnalytics(marketId, m.creator, msg.sender, isYes, false, grossEthOut);

        (bool ok, ) = msg.sender.call{value: netEthOut}("");
        if (!ok) revert TransferFailed();

        _assertSolvency();
        _emitOpinionTraded(marketId, msg.sender, isYes, false, grossEthOut, sharesIn);
    }

    function _buy(
        uint256 marketId,
        address buyer,
        bool isYes,
        uint256 ethIn,
        uint256 minSharesOut
    ) internal returns (uint256 sharesOut) {
        Market storage m = _markets[marketId];
        SideCurve storage curve = isYes ? m.yesCurve : m.noCurve;

        uint256 creatorFee = (ethIn * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 protocolFee = (ethIn * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 netEth = ethIn - creatorFee - protocolFee;

        uint256 newRealEth = curve.realEth + netEth;
        uint256 newVirtualEth = INITIAL_VIRTUAL_ETH + newRealEth;
        uint256 newVirtualShares = (CURVE_INVARIANT_K + newVirtualEth - 1) / newVirtualEth;
        sharesOut = curve.virtualShares > newVirtualShares ? curve.virtualShares - newVirtualShares : 0;

        if (sharesOut == 0 || sharesOut < minSharesOut) revert SlippageExceeded();

        curve.realEth = newRealEth;
        curve.virtualEth = newVirtualEth;
        curve.totalShares += sharesOut;
        curve.virtualShares = INITIAL_VIRTUAL_SHARES - curve.totalShares;
        curve.volumeEth += ethIn;

        totalRealEthLocked += netEth;

        if (curve.virtualEth * curve.virtualShares < CURVE_INVARIANT_K) {
            revert SolvencyInvariantViolated();
        }

        if (isYes) {
            yesBalances[marketId][buyer] += sharesOut;
        } else {
            noBalances[marketId][buyer] += sharesOut;
        }

        claimableCreatorFees[m.creator] += creatorFee;
        lifetimeCreatorFees[m.creator] += creatorFee;
        totalClaimableCreatorFees += creatorFee;
        m.creatorFeesEarned += creatorFee;
        protocolFeesAccrued += protocolFee;
        m.totalTrades += 1;

        _recordTradeAnalytics(marketId, m.creator, buyer, isYes, true, ethIn);
        _emitOpinionTraded(marketId, buyer, isYes, true, ethIn, sharesOut);
    }

    function _checkTradingActive(uint256 marketId) internal {
        Market storage m = _markets[marketId];
        if (m.marketType == MarketType.RESOLVABLE_PREDICTION) {
            if (m.status != MarketStatus.ACTIVE || block.timestamp >= m.prediction.closingTime) {
                if (m.status == MarketStatus.ACTIVE && block.timestamp >= m.prediction.closingTime) {
                    m.status = MarketStatus.CLOSED;
                }
                revert TradingClosed();
            }
        }
    }

    // -------------------------------------------------------------------------
    // Prediction Market Resolution Engine
    // -------------------------------------------------------------------------

    /**
     * @notice Propose an outcome for a closed prediction market.
     *         Market creators can NEVER propose or finalize their own market (anti-manipulation).
     */
    function proposeOutcome(
        uint256 marketId,
        Outcome outcome,
        string calldata evidenceUrl
    ) external onlyResolver validMarket(marketId) {
        Market storage m = _markets[marketId];
        if (m.marketType != MarketType.RESOLVABLE_PREDICTION) revert MarketNotResolvable();
        if (msg.sender == m.creator) revert CreatorCannotResolveOwnMarket();
        if (block.timestamp < m.prediction.closingTime) revert TradingClosed();
        if (m.status != MarketStatus.ACTIVE && m.status != MarketStatus.CLOSED) revert InvalidMarketStatus();
        if (outcome != Outcome.YES && outcome != Outcome.NO && outcome != Outcome.VOID) revert InvalidMarketStatus();

        m.status = MarketStatus.PROPOSED;
        m.prediction.proposer = msg.sender;
        m.prediction.proposedOutcome = outcome;
        m.prediction.proposedEvidence = evidenceUrl;
        m.prediction.proposedAt = block.timestamp;
        m.prediction.disputeDeadline = block.timestamp + disputeWindowDuration;

        emit OutcomeProposed(marketId, outcome, msg.sender, evidenceUrl, m.prediction.disputeDeadline);
    }

    /**
     * @notice Challenge a proposed outcome during the dispute window with counter-evidence.
     */
    function disputeOutcome(
        uint256 marketId,
        string calldata counterEvidenceUrl
    ) external validMarket(marketId) {
        Market storage m = _markets[marketId];
        if (m.marketType != MarketType.RESOLVABLE_PREDICTION) revert MarketNotResolvable();
        if (m.status != MarketStatus.PROPOSED) revert InvalidMarketStatus();
        if (block.timestamp >= m.prediction.disputeDeadline) revert ChallengePeriodExpired();

        m.status = MarketStatus.DISPUTED;
        m.prediction.disputer = msg.sender;
        m.prediction.disputeEvidence = counterEvidenceUrl;
        m.prediction.disputedAt = block.timestamp;

        emit OutcomeDisputed(marketId, m.prediction.proposedOutcome, msg.sender, counterEvidenceUrl);
    }

    /**
     * @notice Finalize market resolution and unlock settlement claims.
     *         If PROPOSED: Callable by resolver once disputeDeadline has passed with no dispute.
     *         If DISPUTED: Callable by admin/resolver after adjudicating counter-evidence.
     */
    function resolveMarket(
        uint256 marketId,
        Outcome finalOutcome,
        string calldata adjudicationEvidence
    ) external onlyResolver validMarket(marketId) {
        Market storage m = _markets[marketId];
        if (m.marketType != MarketType.RESOLVABLE_PREDICTION) revert MarketNotResolvable();
        if (msg.sender == m.creator) revert CreatorCannotResolveOwnMarket();

        if (m.status == MarketStatus.PROPOSED) {
            if (block.timestamp < m.prediction.disputeDeadline) revert ChallengePeriodActive();
            // Automatically confirm proposed outcome if no dispute
            if (finalOutcome == Outcome.UNRESOLVED) {
                finalOutcome = m.prediction.proposedOutcome;
            }
        } else if (m.status != MarketStatus.DISPUTED) {
            revert InvalidMarketStatus();
        }

        uint256 distributablePool = m.yesCurve.realEth + m.noCurve.realEth;
        uint256 winShares = 0;

        if (finalOutcome == Outcome.YES) {
            winShares = m.yesCurve.totalShares;
            // Zero-winner fallback: if no YES shares exist, fallback to VOID refund
            if (winShares == 0) finalOutcome = Outcome.VOID;
        } else if (finalOutcome == Outcome.NO) {
            winShares = m.noCurve.totalShares;
            if (winShares == 0) finalOutcome = Outcome.VOID;
        }

        if (finalOutcome == Outcome.VOID) {
            m.status = MarketStatus.VOID;
            m.prediction.finalOutcome = Outcome.VOID;
        } else {
            m.status = MarketStatus.RESOLVED;
            m.prediction.finalOutcome = finalOutcome;
            m.prediction.distributablePool = distributablePool;
            m.prediction.winningTotalShares = winShares;
        }

        m.prediction.resolvedAt = block.timestamp;

        emit MarketResolved(marketId, finalOutcome, distributablePool, winShares, adjudicationEvidence);
    }

    /**
     * @notice Emergency administrative circuit breaker to cancel an invalid/exploited market into VOID state.
     */
    function emergencyCancelMarket(uint256 marketId, string calldata reason) external onlyOwner validMarket(marketId) {
        Market storage m = _markets[marketId];
        if (m.status == MarketStatus.RESOLVED) revert InvalidMarketStatus();
        m.status = MarketStatus.VOID;
        m.prediction.finalOutcome = Outcome.VOID;
        m.prediction.resolvedAt = block.timestamp;
        emit MarketResolved(marketId, Outcome.VOID, m.yesCurve.realEth + m.noCurve.realEth, 0, reason);
    }

    // -------------------------------------------------------------------------
    // Settlement Claims (Pari-Mutuel & VOID Refunds)
    // -------------------------------------------------------------------------

    /**
     * @notice Claim winning settlement payout on a RESOLVED prediction market.
     *         Payout strictly proportional to winning shares against real distributable pool.
     *         0% creator/protocol fees charged on settlement payouts.
     */
    function claimSettlementReward(uint256 marketId) external nonReentrant validMarket(marketId) returns (uint256 reward) {
        Market storage m = _markets[marketId];
        if (m.marketType != MarketType.RESOLVABLE_PREDICTION) revert MarketNotResolvable();
        if (m.status != MarketStatus.RESOLVED) revert InvalidMarketStatus();
        if (hasClaimedSettlement[marketId][msg.sender]) revert AlreadyClaimed();

        Outcome winner = m.prediction.finalOutcome;
        uint256 userShares = 0;

        if (winner == Outcome.YES) {
            userShares = yesBalances[marketId][msg.sender];
            if (userShares == 0) revert NoWinningShares();
            yesBalances[marketId][msg.sender] = 0;
        } else if (winner == Outcome.NO) {
            userShares = noBalances[marketId][msg.sender];
            if (userShares == 0) revert NoWinningShares();
            noBalances[marketId][msg.sender] = 0;
        } else {
            revert InvalidMarketStatus();
        }

        reward = (m.prediction.distributablePool * userShares) / m.prediction.winningTotalShares;
        if (reward == 0) revert ZeroAmount();

        hasClaimedSettlement[marketId][msg.sender] = true;
        m.prediction.totalClaimedSettlement += reward;
        totalRealEthLocked -= reward;

        (bool ok, ) = msg.sender.call{value: reward}("");
        if (!ok) revert TransferFailed();

        _assertSolvency();
        emit SettlementClaimed(marketId, msg.sender, reward, userShares);
    }

    /**
     * @notice Claim proportional refund on a VOID prediction market.
     */
    function claimVoidRefund(uint256 marketId) external nonReentrant validMarket(marketId) returns (uint256 refundAmount) {
        Market storage m = _markets[marketId];
        if (m.status != MarketStatus.VOID) revert InvalidMarketStatus();
        if (hasClaimedSettlement[marketId][msg.sender]) revert AlreadyClaimed();

        uint256 userYes = yesBalances[marketId][msg.sender];
        uint256 userNo = noBalances[marketId][msg.sender];
        if (userYes == 0 && userNo == 0) revert NoWinningShares();

        uint256 yesRefund = m.yesCurve.totalShares > 0 ? (m.yesCurve.realEth * userYes) / m.yesCurve.totalShares : 0;
        uint256 noRefund = m.noCurve.totalShares > 0 ? (m.noCurve.realEth * userNo) / m.noCurve.totalShares : 0;
        refundAmount = yesRefund + noRefund;
        if (refundAmount == 0) revert ZeroAmount();

        hasClaimedSettlement[marketId][msg.sender] = true;
        yesBalances[marketId][msg.sender] = 0;
        noBalances[marketId][msg.sender] = 0;
        totalRealEthLocked -= refundAmount;

        (bool ok, ) = msg.sender.call{value: refundAmount}("");
        if (!ok) revert TransferFailed();

        _assertSolvency();
        emit VoidRefundClaimed(marketId, msg.sender, refundAmount);
    }

    /**
     * @notice Preview claimable settlement amount for any user without executing a transaction.
     */
    function getSettlementQuote(
        uint256 marketId,
        address user
    ) external view validMarket(marketId) returns (
        bool isEligible,
        uint256 estimatedPayoutWei,
        Outcome winningOutcome,
        bool alreadyClaimed
    ) {
        Market storage m = _markets[marketId];
        alreadyClaimed = hasClaimedSettlement[marketId][user];
        winningOutcome = m.prediction.finalOutcome;

        if (alreadyClaimed) {
            return (false, 0, winningOutcome, true);
        }

        if (m.status == MarketStatus.RESOLVED) {
            uint256 userShares = winningOutcome == Outcome.YES ? yesBalances[marketId][user] : noBalances[marketId][user];
            if (userShares > 0 && m.prediction.winningTotalShares > 0) {
                estimatedPayoutWei = (m.prediction.distributablePool * userShares) / m.prediction.winningTotalShares;
                isEligible = estimatedPayoutWei > 0;
            }
        } else if (m.status == MarketStatus.VOID) {
            uint256 userYes = yesBalances[marketId][user];
            uint256 userNo = noBalances[marketId][user];
            uint256 yesRefund = m.yesCurve.totalShares > 0 ? (m.yesCurve.realEth * userYes) / m.yesCurve.totalShares : 0;
            uint256 noRefund = m.noCurve.totalShares > 0 ? (m.noCurve.realEth * userNo) / m.noCurve.totalShares : 0;
            estimatedPayoutWei = yesRefund + noRefund;
            isEligible = estimatedPayoutWei > 0;
        }
    }

    // -------------------------------------------------------------------------
    // Creator Fee Claiming
    // -------------------------------------------------------------------------

    /**
     * @notice Withdraw accrued creator fees across all markets created.
     */
    function claimCreatorFees() external nonReentrant returns (uint256 amount) {
        amount = claimableCreatorFees[msg.sender];
        if (amount == 0) revert ZeroAmount();

        claimableCreatorFees[msg.sender] = 0;
        totalClaimableCreatorFees -= amount;
        claimedCreatorFees[msg.sender] += amount;
        uint256 claimIdx = ++creatorClaimCount[msg.sender];

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        _assertSolvency();

        emit CreatorFeesClaimed(msg.sender, amount, claimIdx, block.timestamp);
    }

    /**
     * @notice Withdraw protocol fees (owner only).
     */
    function claimProtocolFees(address recipient) external nonReentrant onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 amount = protocolFeesAccrued;
        if (amount == 0) revert ZeroAmount();
        protocolFeesAccrued = 0;

        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();

        _assertSolvency();

        emit ProtocolFeesClaimed(recipient, amount, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Solvency Verification
    // -------------------------------------------------------------------------

    function _assertSolvency() internal view {
        uint256 requiredBacking = totalRealEthLocked + totalClaimableCreatorFees + protocolFeesAccrued;
        if (address(this).balance < requiredBacking) {
            revert SolvencyInvariantViolated();
        }
    }

    /**
     * @notice Public audit verification confirming 100% real ETH backing for curves, fees, and settlements.
     */
    function verifyProtocolSolvency()
        external
        view
        returns (
            bool isSolvent,
            uint256 contractEthBalance,
            uint256 realEthReserves,
            uint256 pendingCreatorFees,
            uint256 pendingProtocolFees,
            uint256 surplusWei
        )
    {
        contractEthBalance = address(this).balance;
        realEthReserves = totalRealEthLocked;
        pendingCreatorFees = totalClaimableCreatorFees;
        pendingProtocolFees = protocolFeesAccrued;
        uint256 required = realEthReserves + pendingCreatorFees + pendingProtocolFees;
        isSolvent = contractEthBalance >= required;
        surplusWei = isSolvent ? contractEthBalance - required : 0;
    }

    // -------------------------------------------------------------------------
    // Quotes & View Functions
    // -------------------------------------------------------------------------

    function quoteBuy(
        uint256 marketId,
        bool isYes,
        uint256 ethIn
    ) external view validMarket(marketId) returns (uint256 sharesOut, uint256 feeEth, uint256 newPriceWei) {
        if (ethIn == 0) return (0, 0, 0);
        Market storage m = _markets[marketId];
        SideCurve storage curve = isYes ? m.yesCurve : m.noCurve;

        uint256 cFee = (ethIn * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 pFee = (ethIn * protocolFeeBps) / BPS_DENOMINATOR;
        feeEth = cFee + pFee;

        uint256 netEth = ethIn - feeEth;
        uint256 newVirtualEth = curve.virtualEth + netEth;
        uint256 newVirtualShares = (CURVE_INVARIANT_K + newVirtualEth - 1) / newVirtualEth;
        sharesOut = curve.virtualShares > newVirtualShares ? curve.virtualShares - newVirtualShares : 0;
        newPriceWei = (newVirtualEth * 1e18) / newVirtualShares;
    }

    function quoteSell(
        uint256 marketId,
        bool isYes,
        uint256 sharesIn
    ) external view validMarket(marketId) returns (uint256 netEthOut, uint256 feeEth, uint256 newPriceWei) {
        if (sharesIn == 0) return (0, 0, 0);
        Market storage m = _markets[marketId];
        SideCurve storage curve = isYes ? m.yesCurve : m.noCurve;

        uint256 newVirtualShares = curve.virtualShares + sharesIn;
        if (newVirtualShares > INITIAL_VIRTUAL_SHARES) {
            newVirtualShares = INITIAL_VIRTUAL_SHARES;
        }
        uint256 newVirtualEth = (CURVE_INVARIANT_K + newVirtualShares - 1) / newVirtualShares;
        if (newVirtualEth < INITIAL_VIRTUAL_ETH) {
            newVirtualEth = INITIAL_VIRTUAL_ETH;
        }
        uint256 grossEthOut = curve.virtualEth > newVirtualEth ? curve.virtualEth - newVirtualEth : 0;
        if (grossEthOut > curve.realEth) {
            grossEthOut = curve.realEth;
        }
        uint256 cFee = (grossEthOut * creatorFeeBps) / BPS_DENOMINATOR;
        uint256 pFee = (grossEthOut * protocolFeeBps) / BPS_DENOMINATOR;
        feeEth = cFee + pFee;
        netEthOut = grossEthOut - feeEth;
        newPriceWei = ((curve.virtualEth - grossEthOut) * 1e18) / newVirtualShares;
    }

    function getMarket(uint256 marketId) public view validMarket(marketId) returns (MarketSummary memory summary) {
        Market storage m = _markets[marketId];
        (uint256 yesPrice, uint256 noPrice, uint256 sentimentBps) = _getMarketMetrics(m);

        MarketStatus currentStatus = m.status;
        if (
            m.marketType == MarketType.RESOLVABLE_PREDICTION &&
            currentStatus == MarketStatus.ACTIVE &&
            block.timestamp >= m.prediction.closingTime
        ) {
            currentStatus = MarketStatus.CLOSED;
        }

        summary = MarketSummary({
            id: m.id,
            creator: m.creator,
            question: m.question,
            category: m.category,
            imageUri: m.imageUri,
            sourceHandle: m.sourceHandle,
            createdAt: m.createdAt,
            totalTrades: m.totalTrades,
            creatorFeesEarned: m.creatorFeesEarned,
            yesRealEth: m.yesCurve.realEth,
            noRealEth: m.noCurve.realEth,
            yesTotalShares: m.yesCurve.totalShares,
            noTotalShares: m.noCurve.totalShares,
            yesVolumeEth: m.yesCurve.volumeEth,
            noVolumeEth: m.noCurve.volumeEth,
            yesPriceWei: yesPrice,
            noPriceWei: noPrice,
            yesSentimentBps: sentimentBps,
            marketType: m.marketType,
            status: currentStatus,
            closingTime: m.prediction.closingTime,
            resolutionDeadline: m.prediction.resolutionDeadline,
            finalOutcome: m.prediction.finalOutcome,
            distributablePool: m.prediction.distributablePool,
            winningTotalShares: m.prediction.winningTotalShares,
            evidenceSource: m.prediction.evidenceSource
        });
    }

    function getMarketPredictionDetails(uint256 marketId) external view validMarket(marketId) returns (PredictionDetails memory) {
        return _markets[marketId].prediction;
    }

    function getMarketAnalytics(uint256 marketId) external view validMarket(marketId) returns (MarketAnalytics memory) {
        return _analytics[marketId];
    }

    function getUserStats(address user) external view returns (UserOnChainStats memory) {
        return UserOnChainStats({
            marketsCreated: userMarketsCreated[user],
            totalTrades: userTotalTrades[user],
            totalVolumeWei: userTotalVolumeWei[user],
            uniqueMarketsTraded: userUniqueMarketsTraded[user],
            creatorVolumeGeneratedWei: creatorVolumeGeneratedWei[user],
            claimableCreatorFeesWei: claimableCreatorFees[user],
            lifetimeCreatorFeesWei: lifetimeCreatorFees[user],
            totalCreatorFeesClaimedWei: claimedCreatorFees[user],
            creatorClaimCount: creatorClaimCount[user]
        });
    }

    function getAllMarkets() external view returns (MarketSummary[] memory list) {
        list = new MarketSummary[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            list[i - 1] = getMarket(i);
        }
    }

    function getMarketsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (MarketSummary[] memory list, uint256 total) {
        total = marketCount;
        if (offset >= total || limit == 0) {
            return (new MarketSummary[](0), total);
        }
        uint256 count = total - offset;
        if (count > limit) count = limit;
        list = new MarketSummary[](count);
        for (uint256 i = 0; i < count; i++) {
            list[i] = getMarket(offset + i + 1);
        }
    }

    function getUserPositions(address user) external view returns (UserPosition[] memory positions) {
        positions = new UserPosition[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            uint256 yShares = yesBalances[i][user];
            uint256 nShares = noBalances[i][user];
            uint256 yVal = 0;
            uint256 nVal = 0;
            if (yShares > 0) {
                (yVal, , ) = this.quoteSell(i, true, yShares);
            }
            if (nShares > 0) {
                (nVal, , ) = this.quoteSell(i, false, nShares);
            }
            (, uint256 estimatedPayout, , bool claimed) = this.getSettlementQuote(i, user);
            positions[i - 1] = UserPosition({
                marketId: i,
                yesShares: yShares,
                noShares: nShares,
                yesValueEth: yVal,
                noValueEth: nVal,
                hasClaimedSettlement: claimed,
                claimableSettlementEth: estimatedPayout
            });
        }
    }

    function _getMarketMetrics(
        Market storage m
    ) internal view returns (uint256 yesPriceWei, uint256 noPriceWei, uint256 yesSentimentBps) {
        yesPriceWei = (m.yesCurve.virtualEth * 1e18) / m.yesCurve.virtualShares;
        noPriceWei = (m.noCurve.virtualEth * 1e18) / m.noCurve.virtualShares;
        uint256 total = yesPriceWei + noPriceWei;
        if (total == 0) {
            yesSentimentBps = 5000;
        } else {
            yesSentimentBps = (yesPriceWei * BPS_DENOMINATOR) / total;
        }
    }

    function _emitOpinionTraded(
        uint256 marketId,
        address trader,
        bool isYes,
        bool isBuy,
        uint256 ethAmount,
        uint256 shareAmount
    ) internal {
        Market storage m = _markets[marketId];
        (uint256 yesPrice, uint256 noPrice, uint256 sentimentBps) = _getMarketMetrics(m);
        if (isBuy) {
            MarketAnalytics storage ma = _analytics[marketId];
            if (yesPrice > ma.peakYesPriceWei) ma.peakYesPriceWei = yesPrice;
            if (noPrice > ma.peakNoPriceWei) ma.peakNoPriceWei = noPrice;
        }
        emit OpinionTraded(
            marketId,
            trader,
            isYes,
            isBuy,
            ethAmount,
            shareAmount,
            yesPrice,
            noPrice,
            sentimentBps,
            block.timestamp
        );
    }

    function _recordTradeAnalytics(
        uint256 marketId,
        address creator,
        address trader,
        bool isYes,
        bool isBuy,
        uint256 volumeWei
    ) internal {
        MarketAnalytics storage ma = _analytics[marketId];
        if (!hasTradedMarket[marketId][trader]) {
            hasTradedMarket[marketId][trader] = true;
            ma.uniqueTraders += 1;
            userUniqueMarketsTraded[trader] += 1;
        }
        if (isYes) {
            ma.yesTrades += 1;
            if (isBuy) ma.yesBuyVolumeEth += volumeWei;
            else ma.yesSellVolumeEth += volumeWei;
        } else {
            ma.noTrades += 1;
            if (isBuy) ma.noBuyVolumeEth += volumeWei;
            else ma.noSellVolumeEth += volumeWei;
        }
        ma.lastTradeAt = block.timestamp;

        userTotalTrades[trader] += 1;
        userTotalVolumeWei[trader] += volumeWei;
        creatorVolumeGeneratedWei[creator] += volumeWei;
    }
}
