// Auto-generated from contracts/NullhoodMarkets.sol by scripts/compile-contract.mjs
export const NULLHOOD_MARKETS_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyClaimed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChallengePeriodActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ChallengePeriodExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ContractPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CreatorCannotResolveOwnMarket",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "unlockTimestamp",
        "type": "uint256"
      }
    ],
    "name": "CreatorSeedLocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyQuestion",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientShares",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDates",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFeeConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMarket",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMarketStatus",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketNotResolvable",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoWinningShares",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuard",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SolvencyInvariantViolated",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "provided",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minimum",
        "type": "uint256"
      }
    ],
    "name": "TradeBelowMinimum",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradingClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAmount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "claimIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "CreatorFeesClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "minTradingDuration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxTradingDuration",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "disputeWindowDuration",
        "type": "uint256"
      }
    ],
    "name": "DateGovernanceUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creatorFeeBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "protocolFeeBps",
        "type": "uint256"
      }
    ],
    "name": "FeeConfigurationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "enum NullhoodMarkets.MarketType",
        "name": "marketType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "closingTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "finalOutcome",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "distributablePool",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "winningTotalShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "adjudicationEvidence",
        "type": "string"
      }
    ],
    "name": "MarketResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "trader",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ethAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shareAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newYesPriceWei",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newNoPriceWei",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "yesSentimentBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "OpinionTraded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "challengedOutcome",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "disputer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "counterEvidenceUrl",
        "type": "string"
      }
    ],
    "name": "OutcomeDisputed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "proposedOutcome",
        "type": "uint8"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "proposer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "evidenceUrl",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "disputeDeadline",
        "type": "uint256"
      }
    ],
    "name": "OutcomeProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isPaused",
        "type": "bool"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "triggeredBy",
        "type": "address"
      }
    ],
    "name": "PausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ProtocolFeesClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "resolver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isAuthorized",
        "type": "bool"
      }
    ],
    "name": "ResolverAuthorizationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardEth",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "sharesBurned",
        "type": "uint256"
      }
    ],
    "name": "SettlementClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "refundEth",
        "type": "uint256"
      }
    ],
    "name": "VoidRefundClaimed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BPS_DENOMINATOR",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CREATOR_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CREATOR_SEED_LOCK_PERIOD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CURVE_INVARIANT_K",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "INITIAL_VIRTUAL_ETH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "INITIAL_VIRTUAL_SHARES",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_STRING_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_TOTAL_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_TRADE_ETH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "minSharesOut",
        "type": "uint256"
      }
    ],
    "name": "buyShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sharesOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimCreatorFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "claimProtocolFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "name": "claimSettlementReward",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reward",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "name": "claimVoidRefund",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "refundAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "claimableCreatorFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "claimedCreatorFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageUri",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "sourceHandle",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "initialSideIsYes",
        "type": "bool"
      }
    ],
    "name": "createMarket",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "question",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "category",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "imageUri",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "sourceHandle",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "closingTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "resolutionDeadline",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "yesCondition",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "noCondition",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "evidenceSource",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "initialSideIsYes",
        "type": "bool"
      }
    ],
    "name": "createPredictionMarket",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "creatorClaimCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creatorFeeBps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "creatorSeedLockUntil",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "creatorVolumeGeneratedWei",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "counterEvidenceUrl",
        "type": "string"
      }
    ],
    "name": "disputeOutcome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "disputeWindowDuration",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "emergencyCancelMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllMarkets",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "question",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "category",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "imageUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "sourceHandle",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorFeesEarned",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesSentimentBps",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketType",
            "name": "marketType",
            "type": "uint8"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "closingTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolutionDeadline",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.Outcome",
            "name": "finalOutcome",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "distributablePool",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "winningTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "evidenceSource",
            "type": "string"
          }
        ],
        "internalType": "struct NullhoodMarkets.MarketSummary[]",
        "name": "list",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "name": "getMarket",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "question",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "category",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "imageUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "sourceHandle",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorFeesEarned",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesSentimentBps",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketType",
            "name": "marketType",
            "type": "uint8"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "closingTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolutionDeadline",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.Outcome",
            "name": "finalOutcome",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "distributablePool",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "winningTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "evidenceSource",
            "type": "string"
          }
        ],
        "internalType": "struct NullhoodMarkets.MarketSummary",
        "name": "summary",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "name": "getMarketAnalytics",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "yesBuyVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesSellVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noBuyVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noSellVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "uniqueTraders",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "peakYesPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "peakNoPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastTradeAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct NullhoodMarkets.MarketAnalytics",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      }
    ],
    "name": "getMarketPredictionDetails",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "closingTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolutionDeadline",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputeDeadline",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "yesCondition",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "noCondition",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "evidenceSource",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "proposedEvidence",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "disputeEvidence",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "proposer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "disputer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "proposedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolvedAt",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.Outcome",
            "name": "proposedOutcome",
            "type": "uint8"
          },
          {
            "internalType": "enum NullhoodMarkets.Outcome",
            "name": "finalOutcome",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "distributablePool",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "winningTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalClaimedSettlement",
            "type": "uint256"
          }
        ],
        "internalType": "struct NullhoodMarkets.PredictionDetails",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getMarketsPaginated",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "question",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "category",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "imageUri",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "sourceHandle",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorFeesEarned",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noRealEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noVolumeEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noPriceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesSentimentBps",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketType",
            "name": "marketType",
            "type": "uint8"
          },
          {
            "internalType": "enum NullhoodMarkets.MarketStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "closingTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "resolutionDeadline",
            "type": "uint256"
          },
          {
            "internalType": "enum NullhoodMarkets.Outcome",
            "name": "finalOutcome",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "distributablePool",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "winningTotalShares",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "evidenceSource",
            "type": "string"
          }
        ],
        "internalType": "struct NullhoodMarkets.MarketSummary[]",
        "name": "list",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getSettlementQuote",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isEligible",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "estimatedPayoutWei",
        "type": "uint256"
      },
      {
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "winningOutcome",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "alreadyClaimed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserPositions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "marketId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "yesValueEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "noValueEth",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "hasClaimedSettlement",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "claimableSettlementEth",
            "type": "uint256"
          }
        ],
        "internalType": "struct NullhoodMarkets.UserPosition[]",
        "name": "positions",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "marketsCreated",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalTrades",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalVolumeWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "uniqueMarketsTraded",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorVolumeGeneratedWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "claimableCreatorFeesWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lifetimeCreatorFeesWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalCreatorFeesClaimedWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorClaimCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct NullhoodMarkets.UserOnChainStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasClaimedSettlement",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasTradedMarket",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isAuthorizedResolver",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "lifetimeCreatorFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "marketCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxResolutionGracePeriod",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxTradingDuration",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minTradingDuration",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "noBalances",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "outcome",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "evidenceUrl",
        "type": "string"
      }
    ],
    "name": "proposeOutcome",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFeeBps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolFeesAccrued",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "ethIn",
        "type": "uint256"
      }
    ],
    "name": "quoteBuy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sharesOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "feeEth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newPriceWei",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "sharesIn",
        "type": "uint256"
      }
    ],
    "name": "quoteSell",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netEthOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "feeEth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newPriceWei",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "enum NullhoodMarkets.Outcome",
        "name": "finalOutcome",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "adjudicationEvidence",
        "type": "string"
      }
    ],
    "name": "resolveMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "marketId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isYes",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "sharesIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minEthOut",
        "type": "uint256"
      }
    ],
    "name": "sellShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netEthOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "resolver",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "authorized",
        "type": "bool"
      }
    ],
    "name": "setAuthorizedResolver",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_minTradingDuration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_maxTradingDuration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_disputeWindowDuration",
        "type": "uint256"
      }
    ],
    "name": "setDateGovernance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_creatorFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_protocolFeeBps",
        "type": "uint256"
      }
    ],
    "name": "setFeeConfiguration",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "_paused",
        "type": "bool"
      }
    ],
    "name": "setPaused",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalClaimableCreatorFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalFeeBps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalRealEthLocked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userMarketsCreated",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userTotalTrades",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userTotalVolumeWei",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userUniqueMarketsTraded",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verifyProtocolSolvency",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isSolvent",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "contractEthBalance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "realEthReserves",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "pendingCreatorFees",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "pendingProtocolFees",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "surplusWei",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "yesBalances",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const NULLHOOD_MARKETS_BYTECODE: `0x${string}` = "0x6080806040523460665760646002556064600355620151806004556276a70060055562278d00600655620151806007556001601d553360018060a01b03195f5416175f55335f52601260205260405f20600160ff198254161790556154a9908161006b8239f35b5f80fdfe6101e060405260033611610011575f80fd5b5f3560e01c80630176aa8714613ffa578063045997d01461353d57806304cada1f146135055780630576fce01461342057806306e2d39c146133e85780630ec4ca94146131465780630feb1365146130a0578063113838a11461307c57806316c38b3c1461300457806317773ebb14612fe75780631bb190af14612faf5780631f7f12dc14612f665780632443200714612f2e57806326d7700714612f0e5780632a6bc2dd14612be1578063301e996b146129be57806332fe68d6146126bd57806334ccc5ea146126a1578063351fee46146125b557806335659fb8146125985780633654ff96146125605780633678923a1461253557806339b463721461229b578063431a9caa1461227f57806345b18f251461225d578063478ba67514612225578063497220a3146120335780634b812414146118285780634e43603a146116cb5780634f01b6921461166557806350a87b3b146116215780635c975abb146115fc57806367eb3ed1146115df57806369ce6d47146115325780636cfc275d14611515578063717bd21d146114e057806373673f9314610f13578063755084c814610ef657806379ba509714610e855780638a94821714610df75780638da5cb5b14610dd05780638f1a5f4f14610d9857806394af820114610d465780639a75ea6c14610ccc578063a0de3e2014610caf578063aec572f914610c77578063b0772d0b14610be8578063b0a992ac146109e3578063b150ceb0146109c6578063b621e75a146109a9578063b6903f511461096c578063be378228146108b4578063be48906014610928578063c3c9c97a146108fe578063c55b5f61146108e2578063c56f84cf146108b9578063cc3cbd2a146108b4578063cd03ada814610897578063d3519aa31461085f578063d791cd1c14610816578063d8a8f35a146107de578063dbf068b11461058d578063e1a4521814610571578063e30c397814610549578063eb44fdd31461050a578063ec979082146104ed578063f2fde38b1461045b5763f8ff0b0b14610305575f80fd5b34610457576020366003190112610457576004355f61012060405161032981614433565b8281528260208201528260408201528260608201528260808201528260a08201528260c08201528260e08201528261010082015201528015801561044c575b61043d575f52600d60205261014060405f2060405161038681614433565b81549182825260018101546020830190815260028201546040840190815260038301546060850190815260048401546080860190815260058501549160a0870192835260068601549360c0880194855260078701549560e08901968752610120600960088a0154996101008c019a8b5201549901988952604051998a525160208a01525160408901525160608801525160808701525160a08601525160c08501525160e08401525161010083015251610120820152f35b639db8d5b160e01b5f5260045ffd5b506008548111610368565b5f80fd5b34610457576020366003190112610457576104746140a8565b5f546001600160a01b031690338290036104df576001600160a01b03169081156104d057600180546001600160a01b031916831790557f38d16b8cac22d99fc7c124b9cd0de2d3fa1faef420bfe791d8c362d765e227005f80a3005b63d92e233d60e01b5f5260045ffd5b6282b42960e81b5f5260045ffd5b34610457575f366003190112610457576020600854604051908152f35b346104575760203660031901126104575761054561053160043561052c614aae565b614c83565b6040519182916020835260208301906141cc565b0390f35b34610457575f366003190112610457576001546040516001600160a01b039091168152602090f35b34610457575f3660031901126104575760206040516127108152f35b34610457576020366003190112610457576004356001601d54036107cf576002601d55801580156107c4575b61043d57805f52600c60205260405f2060ff601382015460081c1660068110156107b0576005036107a1575f82815260116020908152604080832033845290915290205460ff16610792575f828152600f6020908152604080832033808552908352818420548685526010845282852091855292529091205490919082158061078a575b61077b57600c82015461068c939080156107725761066261066792600b860154614173565b6146fe565b915b601181015490811561076857610686926010610662920154614173565b906143c6565b8015610759575f82815260116020908152604080832033808552908352818420805460ff19166001179055858452600f83528184208185528352818420849055858452601083528184209084529091528120556009546106ed9082906143d3565b6009555f80808084335af16107006146cf565b501561074a57602091610711615114565b604051908282527fefd673c0371be3159e310db2e319badafe8ab9213e73b47ae51adad072db8b73843393a36001601d55604051908152f35b6312171d8360e31b5f5260045ffd5b631f2a200560e01b5f5260045ffd5b5050505f906143c6565b50505f91610669565b63843f941b60e01b5f5260045ffd5b50801561063d565b630c8d9eab60e31b5f5260045ffd5b6356d85b9f60e01b5f5260045ffd5b634e487b7160e01b5f52602160045260245ffd5b5060085481116105b9565b6345f5ce8b60e11b5f5260045ffd5b34610457576020366003190112610457576001600160a01b036107ff6140a8565b165f52601a602052602060405f2054604051908152f35b346104575760403660031901126104575761082f6140be565b6004355f52601160205260405f209060018060a01b03165f52602052602060ff60405f2054166040519015158152f35b34610457576020366003190112610457576001600160a01b036108806140a8565b165f526019602052602060405f2054604051908152f35b34610457575f366003190112610457576020600a54604051908152f35b6143ab565b34610457575f3660031901126104575760206108da600254600354906143c6565b604051908152f35b34610457575f3660031901126104575760206040516107088152f35b34610457576020366003190112610457576004355f526017602052602060405f2054604051908152f35b34610457576040366003190112610457576109416140be565b6004355f52601060205260405f209060018060a01b03165f52602052602060405f2054604051908152f35b34610457576020366003190112610457576001600160a01b0361098d6140a8565b165f526012602052602060ff60405f2054166040519015158152f35b34610457575f366003190112610457576020600b54604051908152f35b34610457575f366003190112610457576020600754604051908152f35b34610457576020366003190112610457576004356001601d54036107cf576002601d5580158015610bdd575b61043d57805f52600c60205260405f20601381015460ff811660028110156107b057600103610bce5760081c60ff1660068110156107b0576004036107a1575f82815260116020908152604080832033845290915290205460ff166107925760ff602182015460081c1660048110156107b05760018103610b8a57505f828152600f60209081526040808320338452909152902054801561077b575f838152600f602090815260408083203384529091528120555b610ae0610ad5826022850154614173565b6023840154906146fe565b918215610759575f8481526011602090815260408083203384529091529020805460ff191660011790556024018054610b1a9084906143c6565b9055610b28826009546143d3565b6009555f80808085335af1610b3b6146cf565b501561074a57602092610b4c615114565b60405191838352848301527f6638989f720aba223c8f9e83275c84fb1eb21d030b7cd9397ed57415fd160c4160403393a36001601d55604051908152f35b6002036107a1575f828152601060209081526040808320338452909152902054801561077b575f838152601060209081526040808320338452909152812055610ac4565b638cb3446360e01b5f5260045ffd5b506008548111610a0f565b34610457575f36600319011261045757600854610c0481614b68565b9060015b81811115610c26576040516020808252819061054590820186614353565b610c328161052c614aae565b5f1982019190818311610c635782610c5891610c51610c5e95886145fb565b52856145fb565b506145c5565b610c08565b634e487b7160e01b5f52601160045260245ffd5b3461045757610ca5610c91610c8b366141a9565b90614bb7565b604051928392604084526040840190614353565b9060208301520390f35b34610457575f366003190112610457576020600554604051908152f35b3461045757610cda366141a9565b5f546001600160a01b031633036104df576101f4610cf882846143c6565b11610d3757816040917fb811794cdbbd3b3edd8c81a126a22715321f54152ed5a78b0be23b6b76ee79bc936002558060035582519182526020820152a1005b63369276d760e11b5f5260045ffd5b3461045757610d5436614186565b829192158015610d8d575b61043d5761054592610d709261497f565b604080519384526020840192909252908201529081906060820190565b506008548211610d5f565b34610457576020366003190112610457576001600160a01b03610db96140a8565b165f526018602052602060405f2054604051908152f35b34610457575f366003190112610457575f546040516001600160a01b039091168152602090f35b3461045757604036600319011261045757610e106140a8565b610e18614099565b5f549091906001600160a01b031633036104df576001600160a01b03169081156104d05760207fcea0b9fa3fa76db1b2b1f34ee73d2d72acd8e1261df6842365f46a7e01f64c4f91835f526012825260405f209015159060ff1981541660ff8316179055604051908152a2005b34610457575f366003190112610457576001546001600160a01b03811690338290036104df575f80546001600160a01b0319808216851783559092166001556001600160a01b03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09080a3005b34610457575f366003190112610457576020600654604051908152f35b3461045757608036600319011261045757600435610f2f614099565b90604435916001601d54036107cf576002601d5560ff60015460a01c166114d157811580156114c6575b61043d57821561075957610f6c82615137565b5f828152600c602052604090206001810180546001600160a01b03169491939190338614806114b1575b611491578315611473575f838152600f602090815260408083203384529091529020545b82811061146457841561145b57600986015b6001810190610fdc8583546143c6565b916969e10de76676d08000008311611449575b6c02deaf189c140c16b7c528f67960281b9280840190818511610c63575f198201918211610c6357611020916146fe565b6706f05b59d3b20000811061143a575b8254908082111561143257611044916143d3565b809a6002840191825480911161142a575b508b15610759578b9a60025461106b908d614173565b612710900491828d60035461107f91614173565b61271090049d8e91611090916143d3565b9061109a916143d3565b9c8d6064351161141b5760079361110d925f52601360205260405f206110c18282546143c6565b905560018060a01b038b54165f52601460205260405f206110e38282546143c6565b90556110f181600a546143c6565b600a55611103600885019182546143c6565b9055600b546143c6565b600b550180549060018201809211610c63575561112b8b82546143d3565b8091556706f05b59d3b2000001806706f05b59d3b2000011610c63578255600382016111588782546143d3565b8091556969e10de76676d080000003916969e10de76676d08000008311610c63576111a89282556004810161118e8c82546143c6565b905561119c8b6009546143d3565b60095554905490614173565b1061140c578285156113e5576111bd916143d3565b5f848152600f602090815260408083203384529091529020555b545f838152600d60209081526040808320600e835281842033855290925282205491926001600160a01b03169160ff1615611389575b851561136357600481018054906001820180921161134f57558215611339576112378882546143c6565b81555b600942910155338252601960205260408220805490600182018092116113255790604093929155338252601a6020528282206112778982546143c6565b90558152601c6020522061128c8682546143c6565b90555f80808087335af161129e6146cf565b501561074a576020946112af615114565b825f52600c86526112c260405f206153d4565b93909260405196151587525f8988015260408701526060860152608085015260a084015260c08301524260e08301527f119770bcf0c9631339b568a4dcc973c3f05919742aafd1488cfab86e81be8fc96101003393a36001601d55604051908152f35b634e487b7160e01b84526011600452602484fd5b600181016113488982546143c6565b905561123a565b634e487b7160e01b85526011600452602485fd5b91506005820180549060018201809211610c6357555f91600381016113488982546143c6565b845f52600e60205260405f2060018060a01b0333165f5260205260405f20600160ff198254161790556006810180549060018201809211610c635755335f52601b60205260405f2080549060018201809211610c63575561120d565b6113ee916143d3565b5f8481526010602090815260408083203384529091529020556111d7565b63e8a51ef360e01b5f5260045ffd5b638199f5f360e01b5f5260045ffd5b9b508c611055565b50505f611044565b506706f05b59d3b20000611030565b6969e10de76676d08000009250610fef565b600e8601610fcc565b633999656760e01b5f5260045ffd5b5f838152601060209081526040808320338452909152902054610fba565b5f83815260176020526040812054632d382c6160e01b8252600452602490fd5b50825f52601760205260405f20544210610f96565b506008548211610f59565b63ab35696f60e01b5f5260045ffd5b34610457576114ee36614186565b82919215801561150a575b61043d5761054592610d7092614897565b5060085482116114f9565b34610457575f366003190112610457576020600454604051908152f35b346104575760203660031901126104575761154b6140a8565b6001601d54036107cf576002601d555f546001600160a01b031633036104df576001600160a01b0381169081156104d057600b54908115610759575f808084819482600b555af161159a6146cf565b501561074a5760407ffb2ef6ae65fe7cd7752678feb2a45eaee660236a6a14f929449fecb75118e9a4916115cc615114565b8151908152426020820152a26001601d55005b34610457575f366003190112610457576020600954604051908152f35b34610457575f36600319011261045757602060ff60015460a01c166040519015158152f35b346104575760403660031901126104575761163a6140be565b6004355f52600f60205260405f209060018060a01b03165f52602052602060405f2054604051908152f35b34610457576040366003190112610457576004356116816140be565b811580156116c0575b61043d5761169d6116b79160809361471c565b929391604051941515855260208501526040840190614166565b15156060820152f35b50600854821161168a565b34610457576020366003190112610457576101206116e76140a8565b5f6101006040516116f781614417565b8281528260208201528260408201528260608201528260808201528260a08201528260c08201528260e0820152015260018060a01b0316805f52601860205260405f205490805f52601960205260405f205490805f52601a60205260405f2054815f52601b60205260405f2054825f52601c60205260405f2054835f52601360205260405f205491845f52601460205260405f205493855f52601560205260405f2054955f52601660205260405f2054966101006040516117b781614417565b8a81526020810192835260408101938452606081019485526080810195865260a0810196875260c0810197885260e08101988952019788526040519889525160208901525160408801525160608701525160808601525160a08501525160c08401525160e083015251610100820152f35b60a0366003190112610457576004356001600160401b0381116104575761185390369060040161406c565b6024356001600160401b0381116104575761187290369060040161406c565b92906044356001600160401b0381116104575761189390369060040161406c565b91906064356001600160401b038111610457576118b490369060040161406c565b959091608435958615158703610457576001601d54036107cf576002601d5560ff60015460a01c166114d157611906946118f66118fe926118fe9536916144c2565b9936916144c2565b9436916144c2565b926020945f6040516119188882614486565b525f6040516119278882614486565b525f6040516119368882614486565b52805115612024576102008151118015612019575b801561200d575b8015612002575b611ff357341515928380611fe4575b611fc7576119776008546145c5565b60088190555f818152600c8952604090208181556001810180546001600160a01b03191633179055835191979092909160028401906001600160401b038111611e66576119ce816119c88454614518565b84614550565b8a601f8211600114611f625790806119fa925f91611f57575b508160011b915f199060031b1c19161790565b90555b8051611f515750604051611a12604082614486565b60088152675472656e64696e6760c01b89820152935b845160038401956001600160401b038211611e6657611a5182611a4b8954614518565b89614550565b8a90601f8311600114611eeb57611a7f92915f9183611e7a575b50508160011b915f199060031b1c19161790565b85555b805160048401916001600160401b038211611e6657611aab82611aa58554614518565b85614550565b8a90601f8311600114611e8557611ad892915f9183611e7a5750508160011b915f199060031b1c19161790565b90555b805160058301916001600160401b038211611e6657611afe82611aa58554614518565b8990601f8311600114611dfe57825f959360129593611b31938892611df35750508160011b915f199060031b1c19161790565b90555b42600682015560138101805461ffff191690556040518390608090611b588161446b565b6706f05b59d3b2000081526969e10de76676d08000008c82015282604082015282606082015201526706f05b59d3b2000060098201556969e10de76676d0800000600a82015582600b82015582600c82015582600d820155826080604051611bbf8161446b565b6706f05b59d3b2000081526969e10de76676d08000008c82015282604082015282606082015201526706f05b59d3b20000600e8201556969e10de76676d0800000600f8201558260108201558260118201550155604051611c1f81614433565b5f8152600986888084015f8152604085015f8152606086015f8152608087015f815260a08801915f835260c08901935f855260e08a019564e8d4a510008752600d6101008c019864e8d4a510008a526101208d019a428c525f525260405f209a518b555160018b01555160028a015551600389015551600488015551600587015551600686015551600785015551600884015551910155335f526018865260405f2080549060018201809211610c63575585611ce66040519260a0845260a0840190614142565b92828403828401525f93815491611cfc83614518565b8083529260018116908115611dd65750600114611d9b575b505050507f7a21dafc4856a1fdcf9fd0ee7d2452383e2193f6f83bb3f7af5a648c7cbb2776815f6040889401525f60608201524260808201528033940390a3611d6e575b50611d61615114565b6001601d55604051908152f35b610708420190814211610c6357611d9491835f526017855260405f205534903384614f13565b5082611d58565b9091929394505f52825f2091835f935b828510611dc15750505001019085878080611d14565b80548486018301529301928490600101611dab565b60ff191685840152505090151560051b0101915085878080611d14565b015190508d80611a6b565b90601f19831691845f528b5f20925f5b8d828210611e505750509260019285925f98966012989610611e38575b505050811b019055611b34565b0151871960f88460031b161c191690558c8080611e2b565b6001859682939686015181550195019301611e0e565b634e487b7160e01b5f52604160045260245ffd5b015190508c80611a6b565b5f8481528c8120929190601f198516908e5b828210611ed3575050908460019594939210611ebb575b505050811b019055611adb565b01515f1960f88460031b161c191690558b8080611eae565b80600186978294978701518155019601940190611e97565b5f8881528c8120929190601f198516908e5b828210611f39575050908460019594939210611f21575b505050811b018555611a82565b01515f1960f88460031b161c191690558b8080611f14565b80600186978294978701518155019601940190611efd565b93611a28565b90508701518d6119e7565b5f8381528c81209190601f198416908e5b8a838310611faf575050509083600194939210611f97575b5050811b0190556119fd565b8801515f1960f88460031b161c191690558c80611f8b565b60018596839496849301518155019501930190611f73565b6308b504ff60e31b5f5234600452655af3107a400060245260445ffd5b50655af3107a40003410611968565b631623655b60e31b5f5260045ffd5b506080855111611959565b50610200825111611952565b50604083511161194b565b630d5003f360e01b5f5260045ffd5b3461045757612041366140d4565b91908115801561221a575b61043d57815f52600c60205260405f2060138101805460ff811660028110156107b057600103610bce5760081c60ff1660068110156107b0576002036107a157601682015442101561220b57805461ff001916610300179055601d810180546001600160a01b03191633179055601b81016001600160401b038511611e66576120df856120d98354614518565b83614550565b845f601f8211600114612175576021612152947fae6a959b57e2321b5b69d772b959e00ced22791534442fae0be5ed2b78437b2e9694612139856121659660ff965f9161216a57508160011b915f199060031b1c19161790565b90555b42601f8201550154169160405193848094614166565b60406020840152339660408401916144f8565b0390a3005b90508801358d6119e7565b5f8381526020812092508790601f198216905b8181106121f05750947fae6a959b57e2321b5b69d772b959e00ced22791534442fae0be5ed2b78437b2e96946121659460ff9460219461215299106121d7575b505060018a811b01905561213c565b8701355f1960038d901b60f8161c191690558a806121c8565b8784013585556001909401936020938401938a935001612188565b637222b06b60e11b5f5260045ffd5b50600854821161204c565b34610457576020366003190112610457576001600160a01b036122466140a8565b165f52601c602052602060405f2054604051908152f35b34610457575f3660031901126104575760206040516706f05b59d3b200008152f35b34610457575f3660031901126104575760206040516101f48152f35b6122a436614186565b906001601d54036107cf576002601d5560ff60015460a01c166114d1578215801561252a575b61043d57341561075957655af3107a40003410611fc7576122ea83615137565b825f52600c60205260405f2090805f1461252157600982015b61271061231260025434614173565b049261271061232360035434614173565b04916123388361233387346143d3565b6143d3565b600282016123478282546143c6565b92836706f05b59d3b2000001806706f05b59d3b2000011610c63576c02deaf189c140c16b7c528f67960281b94818601808711610c63575f198101908111610c635782612393916146fe565b60018401805490959180821115612518576123ad916143d3565b9b5b8c1590811561250e575b5061141b57558155600381016123d08a82546143c6565b8091556969e10de76676d0800000036969e10de76676d08000008111610c63576124139361119c918455600483016124093482546143c6565b90556009546143c6565b1061140c57612498600792845f146124de57875f52600f60205260405f2060018060a01b0333165f5260205260405f2061244e8882546143c6565b90555b600183019560018060a01b038754165f52601360205260405f206124768282546143c6565b905560018060a01b038754165f52601460205260405f206110e38282546143c6565b600b55019384549160018301809311610c63576124cd6124d694869460209855823491339060018060a01b03905416866151ce565b3491339061531f565b611d61615114565b875f52601060205260405f2060018060a01b0333165f5260205260405f206125078882546143c6565b9055612451565b90508c108e6123b9565b50505f9b6123af565b600e8201612303565b5060085483116122ca565b34610457575f3660031901126104575760206c02deaf189c140c16b7c528f67960281b604051908152f35b34610457576020366003190112610457576001600160a01b036125816140a8565b165f526016602052602060405f2054604051908152f35b34610457575f366003190112610457576020600354604051908152f35b34610457575f366003190112610457576001601d54036107cf576002601d55335f52601360205260405f2054801561075957335f5260136020525f604081205561260181600a546143d3565b600a55335f52601560205260405f2061261b8282546143c6565b9055335f52601660205260405f209061263482546145c5565b8092555f80808084335af16126476146cf565b501561074a57602091612658615114565b604080518381526020810192909252429082015233907f5c0244eed6965417b3a6bf8a8f7d0f39a05e2c1c362b34d9bc88f936b7905b7190606090a26001601d55604051908152f35b34610457575f3660031901126104575760206040516102008152f35b34610457576020366003190112610457576004355f6102206040516126e1816143fb565b82815282602082015282604082015260608082015260606080820152606060a0820152606060c0820152606060e08201528261010082015282610120820152826101408201528261016082015282610180820152826101a0820152826101c0820152826101e0820152826102008201520152801580156129b3575b61043d575f52600c60205260405f2060246040519161277a836143fb565b6014810154835260158101546020840152601681015460408401526127a160178201614623565b60608401526127b260188201614623565b60808401526127c360198201614623565b60a08401526127d4601a8201614623565b60c08401526127e5601b8201614623565b60e0840152601c8101546001600160a01b03908116610100850152601d82015416610120840152601e810154610140840152601f810154610160840152602081015461018084015260218101546128579060ff906128498183166101a088016146c3565b60081c166101c085016146c3565b60228101546101e08401526023810154610200840152015461022082015260405180916020825280516020830152602081015160408301526040810151606083015261022061291c6129056128ef6128d96128c3606087015161024060808a0152610260890190614142565b6080870151888203601f190160a08a0152614142565b60a0860151878203601f190160c0890152614142565b60c0850151868203601f190160e0880152614142565b60e0840151858203601f1901610100870152614142565b9160018060a01b036101008201511661012085015260018060a01b03610120820151166101408501526101408101516101608501526101608101516101808501526101808101516101a085015261297d6101a08201516101c0860190614166565b6129916101c08201516101e0860190614166565b6101e08101516102008501526102008101518285015201516102408301520390f35b50600854811161275c565b34610457576129cc36614107565b9160018060a01b035f541633141580612bca575b6104df5783158015612bbf575b61043d5780845f52600c60205260405f20926013840191825460ff811660028110156107b057600103610bce5760018601546001600160a01b03163314612bb05760081c60ff1660068110156107b05760028103612b97575060168501544210612b885760048110156107b05715612b79575b612a73600b8501546010860154906143c6565b945f60048510156107b05760018503612b5d5750600c8501548015612b54575b60048510156107b0577f372cd3be51636682639b3096141601c79be9866bff1571d724f675dd194b5c4596612aff96612b1a9560038803612b1f5761050061ff00198254161790556021810161030061ff00198254161790555b60204291015560405196878097614166565b602086015260408501526080606085015260808401916144f8565b0390a2005b61040061ff001982541617905560218101805461ff008960081b169061ff001916179055816022820155826023820155612aed565b60039450612a93565b60028503612a935750601185015480612a935760039450612a93565b602184015460ff169250612a60565b6364b81b1960e11b5f5260045ffd5b600391500315612a60576356d85b9f60e01b5f5260045ffd5b631b7a7a2160e01b5f5260045ffd5b5060085484116129ed565b50335f52601260205260ff60405f205416156129e0565b3461045757602036600319011261045757612bfa6140a8565b60085490612c07826145ae565b91612c156040519384614486565b808352601f19612c24826145ae565b015f5b818110612ecd575090916001600160a01b0316905060015b82811115612ccd57836040518091602082016020835281518091526020604084019201905f5b818110612c73575050500390f35b91935091602060e060019260c0875180518352848101518584015260408101516040840152606081015160608401526080810151608084015260a0810151151560a0840152015160c0820152019401910191849392612c65565b805f52600f60205260405f20825f5260205260405f205490805f52601060205260405f20835f5260205260405f20545f905f84612e6d575b81612e00575b60405192632780db4960e11b8452846004850152866024850152608084604481305afa928315612df5575f945f94612d99575b5060405196612d4c886143e0565b8688526020880152604087015260608601526080850152151560a084015260c08301525f19810191818311610c635782610c5891612d8d612d9495896145fb565b52866145fb565b612c3f565b945092506080843d8211612ded575b81612db560809383614486565b8101031261045757612dc6846145ee565b50602084015193600460408201511015610457576060612de691016145ee565b928a612d3e565b3d9150612da8565b6040513d5f823e3d90fd5b506040516394af820160e01b81528360048201525f6024820152816044820152606081606481305afa908115612df5575f91612e3d575b50612d0b565b612e5e915060603d8111612e66575b612e568183614486565b8101906145d3565b505088612e37565b503d612e4c565b91506040516394af820160e01b815283600482015260016024820152846044820152606081606481305afa908115612df5575f91612ead575b5091612d05565b612ec5915060603d8111612e6657612e568183614486565b505088612ea6565b602090604051612edc816143e0565b5f81525f838201525f60408201525f60608201525f60808201525f60a08201525f60c082015282828801015201612c27565b34610457575f366003190112610457576020604051655af3107a40008152f35b34610457576020366003190112610457576001600160a01b03612f4f6140a8565b165f526014602052602060405f2054604051908152f35b3461045757604036600319011261045757612f7f6140be565b6004355f52600e60205260405f209060018060a01b03165f52602052602060ff60405f2054166040519015158152f35b34610457576020366003190112610457576001600160a01b03612fd06140a8565b165f52601b602052602060405f2054604051908152f35b34610457575f366003190112610457576020600254604051908152f35b3461045757602036600319011261045757600435801515809103610457575f546001600160a01b031633036104df576001805460ff60a01b191660a083901b60ff60a01b1617905560405190815233907f553d0173aaf3da5fa192882a6593e57e95cbf10b294e2e1d5e60806cbeced46290602090a2005b34610457575f3660031901126104575760206040516969e10de76676d08000008152f35b34610457576060366003190112610457575f546044359060243590600435906001600160a01b031633036104df578015801561313d575b61312e576131297f168355202229874cbd4289fa33ba116fa681ab158653c4e08bae8d14823795cd93826004558360055580600755604051938493846040919493926060820195825260208201520152565b0390a1005b63364dd21b60e21b5f5260045ffd5b508181116130d7565b346104575761315436614107565b5f549293926001600160a01b0316331415806133d1575b6104df57821580156133c6575b61043d57825f52600c60205260405f2060138101805460ff811660028110156107b057600103610bce5760018301546001600160a01b03163314612bb057601483015442106133b75760081c60ff1660068110156107b05780151590816133ab575b506107a157600486101590816107b05760018714158061339d575b828161338c575b506107a157805461ff001916610200179055601c820180546001600160a01b0319163317905560218201906107b05760ff1981541660ff8716179055601a81016001600160401b038311611e6657613258836120d98354614518565b5f601f84116001146132ff57926132e6927f640ec794847ad570273a6fa628810e846c930788ccc7bbad808f6efe2beba2bf95926132ae838060169b985f916132f457508160011b915f199060031b1c19161790565b90555b42601e8201556132c3600754426143c6565b97889101556132d56040518095614166565b6060602085015260608401916144f8565b9360408201528033940390a3005b90508601358c6119e7565b601f19841690825f5260205f20915f5b81811061337457509285926132e6959260169a977f640ec794847ad570273a6fa628810e846c930788ccc7bbad808f6efe2beba2bf99961061335b575b5050600183811b0190556132b1565b8501355f19600386901b60f8161c19169055898061334c565b9192602060018192868b01358155019401920161330f565b90506107b0576003871415826131fc565b505f915060028714156131f5565b600191501415876131da565b63e2c865df60e01b5f5260045ffd5b506008548311613178565b50335f52601260205260ff60405f2054161561316b565b34610457576020366003190112610457576001600160a01b036134096140a8565b165f526015602052602060405f2054604051908152f35b346104575761342e366140d4565b5f546001600160a01b031633036104df57821580156134fa575b61043d57825f52600c60205260405f2091601383019260ff845460081c1660068110156107b0576004146107a1576134d3612b1a917f372cd3be51636682639b3096141601c79be9866bff1571d724f675dd194b5c459561050061ff00198254161790556021810161030061ff00198254161790554260208201556010600b820154910154906143c6565b916040519384936003855260208501525f60408501526080606085015260808401916144f8565b506008548311613448565b34610457576020366003190112610457576001600160a01b036135266140a8565b165f526013602052602060405f2054604051908152f35b610140366003190112610457576004356001600160401b0381116104575761356990369060040161406c565b906024356001600160401b0381116104575761358990369060040161406c565b6044929192356001600160401b038111610457576135ab90369060040161406c565b9190946064356001600160401b038111610457576135cd90369060040161406c565b9390966084359260c4356001600160401b038111610457576135f390369060040161406c565b98909260e4356001600160401b0381116104575761361590369060040161406c565b99610104356001600160401b0381116104575761363690369060040161406c565b969094610124359e8f80151503610457576001601d54036107cf576002601d5560ff60015460a01c166114d15761366f600454426143c6565b8b108015613fe6575b8015613fdb575b8015613fc5575b61312e578e158015613fbd575b8015613fb5575b612024576136ce6136d6966136c66136ce946136be6118f6986136de9d36916144c2565b9f36916144c2565b9b36916144c2565b9c36916144c2565b9236916144c2565b90845115612024576102008551118015613faa575b8015613f9e575b8015613f93575b611ff357341515968780613f84575b611fc75761371f6008546145c5565b60088190555f818152600c602052604090208181556001810180546001600160a01b031916331790558751919a9095909160028701906001600160401b038111611e6657613771816119c88454614518565b6020601f8211600114613f2257908061379d925f91613f1757508160011b915f199060031b1c19161790565b90555b8051613f1157506040516137b5604082614486565b60088152675472656e64696e6760c01b6020820152975b885160038701996001600160401b038211611e66576137f5826137ef8d54614518565b8d614550565b602090601f8311600114613eae5761382392915f9183613e405750508160011b915f199060031b1c19161790565b89555b805160048701916001600160401b038211611e665761384982611aa58554614518565b602090601f8311600114613e4b5761387792915f9183613e405750508160011b915f199060031b1c19161790565b90555b805160058601916001600160401b038211611e665761389d82611aa58554614518565b602090601f8311600114613ddd576138cb92915f9183613dd25750508160011b915f199060031b1c19161790565b90555b42600685015560138401805461ffff191660011790556014840185905560a4356015850155805160178501916001600160401b038211611e665761391682611aa58554614518565b602090601f8311600114613d6f5761394492915f9183611df35750508160011b915f199060031b1c19161790565b90555b805160188401916001600160401b038211611e665761396a82611aa58554614518565b602090601f8311600114613d0c5761399892915f9183611e7a5750508160011b915f199060031b1c19161790565b90555b805160198301916001600160401b038211611e66576139be82611aa58554614518565b602090601f8311600114613ca457825f9593601295936139f2938892611df35750508160011b915f199060031b1c19161790565b90555b826080604051613a048161446b565b6706f05b59d3b2000081526969e10de76676d0800000602082015282604082015282606082015201526706f05b59d3b2000060098201556969e10de76676d0800000600a82015582600b82015582600c82015582600d820155826080604051613a6c8161446b565b6706f05b59d3b2000081526969e10de76676d0800000602082015282604082015282606082015201526706f05b59d3b20000600e8201556969e10de76676d0800000600f8201558260108201558260118201550155604051613acd81614433565b5f8152600986602083015f8152604084015f8152606085015f8152608086015f815260a08701905f825260c08801925f845260e089019464e8d4a5100086526101008a019664e8d4a5100088526101208b0198428a525f52600d60205260405f209a518b555160018b01555160028a015551600389015551600488015551600587015551600686015551600785015551600884015551910155335f52601860205260405f2080549060018201809211610c635755613b966040519260a0845260a0840190614142565b9282840360208401525f93815491613bad83614518565b8083529260018116908115613c815750600114613c42575b505050817f7a21dafc4856a1fdcf9fd0ee7d2452383e2193f6f83bb3f7af5a648c7cbb277691600160408895015260608201524260808201528033940390a3613c14575b602090611d61615114565b6107084201804211610c6357602092613c3c91835f526017855260405f205534903384614f13565b50613c09565b5f9081526020812093955091925b838310613c67575060209250010191868080613bc5565b600181602092949394548385870101520191019190613c50565b915050602093955060ff929192191683830152151560051b010191868080613bc5565b90601f19831691845f52815f20925f5b818110613cf457509260019285925f98966012989610613cdc575b505050811b0190556139f5565b0151871960f88460031b161c191690558c8080613ccf565b92936020600181928786015181550195019301613cb4565b90601f19831691845f52815f20925f5b818110613d575750908460019594939210613d3f575b505050811b01905561399b565b01515f1960f88460031b161c191690558b8080613d32565b92936020600181928786015181550195019301613d1c565b90601f19831691845f52815f20925f5b818110613dba5750908460019594939210613da2575b505050811b019055613947565b01515f1960f88460031b161c191690558c8080613d95565b92936020600181928786015181550195019301613d7f565b015190508e80611a6b565b90601f19831691845f52815f20925f5b818110613e285750908460019594939210613e10575b505050811b0190556138ce565b01515f1960f88460031b161c191690558d8080613e03565b92936020600181928786015181550195019301613ded565b015190508f80611a6b565b90601f19831691845f52815f20925f5b818110613e965750908460019594939210613e7e575b505050811b01905561387a565b01515f1960f88460031b161c191690558e8080613e71565b92936020600181928786015181550195019301613e5b565b90601f198316918c5f52815f20925f5b818110613ef95750908460019594939210613ee1575b505050811b018955613826565b01515f1960f88460031b161c191690558e8080613ed4565b92936020600181928786015181550195019301613ebe565b976137cc565b90508b01515f6119e7565b601f19821690835f52805f20915f5b8d828210613f6c5750509083600194939210613f54575b5050811b0190556137a0565b8c01515f1960f88460031b161c191690558f80613f48565b60018495602093958493015181550194019201613f31565b50655af3107a40003410613710565b506080885111613701565b506102008651116136fa565b5060408351116136f3565b50881561369a565b508d15613693565b50613fd26006548c6143c6565b60a43511613686565b508a60a4351061367f565b50613ff3600554426143c6565b8b11613678565b34610457575f3660031901126104575760c04760095490600a54600b549061402b8261402683876143c6565b6143c6565b80841080159591906140645761404190856143d3565b935b604051958652602086015260408501526060840152608083015260a0820152f35b505f93614043565b9181601f84011215610457578235916001600160401b038311610457576020838186019501011161045757565b60243590811515820361045757565b600435906001600160a01b038216820361045757565b602435906001600160a01b038216820361045757565b9060406003198301126104575760043591602435906001600160401b038211610457576141039160040161406c565b9091565b6060600319820112610457576004359160243560048110156104575791604435906001600160401b038211610457576141039160040161406c565b805180835260209291819084018484015e5f828201840152601f01601f1916010190565b9060048210156107b05752565b81810292918115918404141715610c6357565b606090600319011261045757600435906024358015158103610457579060443590565b6040906003190112610457576004359060243590565b9060028210156107b05752565b908151815260018060a01b03602083015116602082015261423d61422b61421961420760408601516103406040870152610340860190614142565b60608601518582036060870152614142565b60808501518482036080860152614142565b60a084015183820360a0850152614142565b9060c083015160c082015260e083015160e08201526101008301516101008201526101208301516101208201526101408301516101408201526101608301516101608201526101808301516101808201526101a08301516101a08201526101c08301516101c08201526101e08301516101e08201526102008301516102008201526102208301516102208201526142de6102408401516102408301906141bf565b61026083015160068110156107b05761435093610320916102608401526102808101516102808401526102a08101516102a08401526143276102c08201516102c0850190614166565b6102e08101516102e0840152610300810151610300840152015190610320818403910152614142565b90565b9080602083519182815201916020808360051b8301019401925f915b83831061437e57505050505090565b909192939460208061439c600193601f1986820301875289516141cc565b9701930193019193929061436f565b34610457575f36600319011261045757602060405160648152f35b91908201809211610c6357565b91908203918211610c6357565b60e081019081106001600160401b03821117611e6657604052565b61024081019081106001600160401b03821117611e6657604052565b61012081019081106001600160401b03821117611e6657604052565b61014081019081106001600160401b03821117611e6657604052565b61034081019081106001600160401b03821117611e6657604052565b60a081019081106001600160401b03821117611e6657604052565b90601f801991011681019081106001600160401b03821117611e6657604052565b6001600160401b038111611e6657601f01601f191660200190565b9291926144ce826144a7565b916144dc6040519384614486565b829481845281830111610457578281602093845f960137010152565b908060209392818452848401375f828201840152601f01601f1916010190565b90600182811c92168015614546575b602083101461453257565b634e487b7160e01b5f52602260045260245ffd5b91607f1691614527565b919091601f8311614561575b505050565b81831161456d57505050565b5f5260205f206020601f830160051c92106145a6575b81601f9101920160051c03905f5b8281101561455c575f82820155600101614591565b5f9150614583565b6001600160401b038111611e665760051b60200190565b5f198114610c635760010190565b90816060910312610457578051916040602083015192015190565b5190811515820361045757565b805182101561460f5760209160051b010190565b634e487b7160e01b5f52603260045260245ffd5b9060405191825f82549261463684614518565b80845293600181169081156146a1575060011461465d575b5061465b92500383614486565b565b90505f9291925260205f20905f915b81831061468557505090602061465b928201015f61464e565b602091935080600191548385890101520191019091849261466c565b90506020925061465b94915060ff191682840152151560051b8201015f61464e565b60048210156107b05752565b3d156146f9573d906146e0826144a7565b916146ee6040519384614486565b82523d5f602084013e565b606090565b8115614708570490565b634e487b7160e01b5f52601260045260245ffd5b9190915f925f92825f52600c60205260405f20835f52601160205260405f2060018060a01b0384165f5260205260ff60405f20541693849360ff602184015460081c16956148885760ff601384015460081c1660068110156107b0576004810361481d57509060048610156107b057600186036147fa575f52600f60205260405f209060018060a01b03165f5260205260405f20545b801515806147ed575b6147c3575050565b819296506147e69395506147dd9060226023930154614173565b910154906146fe565b9182151593565b50602382015415156147bb565b5f52601060205260405f209060018060a01b03165f5260205260405f20546147b2565b60051461482957505050565b5f828152600f602090815260408083206001600160a01b0390941680845293825280832054948352601082528083209383529290522054600c8301549397509395506147e693919280156107725761066261066792600b860154614173565b505f9650869550600193505050565b8215614974575f52600c60205260405f20905f1461496b57600901915b6148f16148ea6148e36127106148cc60025487614173565b046127106148dc60035488614173565b04906143c6565b80946143d3565b84546143c6565b6c02deaf189c140c16b7c528f67960281b818101809111610c63575f198101908111610c6357614923826001926146fe565b940154848082111561496357614938916143d3565b93670de0b6b3a7640000820291808304670de0b6b3a76400001490151715610c6357614350916146fe565b50505f614938565b600e01916148b4565b5050505f905f905f90565b908215614974576149ab915f52600c60205260405f20905f14614aa557600901915b60018301546143c6565b916969e10de76676d08000008311614a93575b6c02deaf189c140c16b7c528f67960281b838101809111610c63575f198101908111610c6357836149ee916146fe565b926706f05b59d3b200008410614a83575b82549380851115614a7c57614a1490856143d3565b600281940154809111614a74575b50614a49614a386127106148cc60025487614173565b93614a4385826143d3565b956143d3565b90670de0b6b3a7640000820291808304670de0b6b3a76400001490151715610c6357614350916146fe565b92505f614a22565b505f614a14565b6706f05b59d3b2000093506149ff565b6969e10de76676d080000092506149be565b600e01916149a1565b60405190614abb8261444f565b6060610320835f81525f602082015282604082015282808201528260808201528260a08201525f60c08201525f60e08201525f6101008201525f6101208201525f6101408201525f6101608201525f6101808201525f6101a08201525f6101c08201525f6101e08201525f6102008201525f6102208201525f6102408201525f6102608201525f6102808201525f6102a08201525f6102c08201525f6102e08201525f6103008201520152565b90614b72826145ae565b614b7f6040519182614486565b8281528092614b90601f19916145ae565b01905f5b828110614ba057505050565b602090614bab614aae565b82828501015201614b94565b9160085491828410801590614c7b575b614c3f57614bd584846143d3565b90808211614c37575b50614be881614b68565b935f5b828110614bf757505050565b614c0181836143c6565b9060018201809211610c6357614c1b60019261052c614aae565b614c2582896145fb565b52614c3081886145fb565b5001614beb565b90505f614bde565b50909150604051614c51602082614486565b5f81525f805b818110614c645750509190565b602090614c6f614aae565b82828601015201614c57565b508015614bc7565b5080158015614f08575b61043d575f52600c60205260405f206101c052614cac6101c0516153d4565b610160529060136101c05101546101805260ff6101805160081c166101a052600260ff610180511610156107b057600160ff61018051161480614ef1575b80614ee0575b614ed5575b6101c051805460018201546001600160a01b03166101005260068201546007830154600880850154600b8601546010870154600c8801546011890154600d8a015460128b015460148c01546101405260158c015460e05260218c015490971c60ff1660805260228b0154610120526023909a015460c05260405160a0819052959998909791969295939493614d899061444f565b60a0515261010051602060a0510152614da760026101c05101614623565b604060a0510152614dbd60036101c05101614623565b606060a0510152614dd360046101c05101614623565b608060a0510152614de960056101c05101614623565b60a08051015260c060a051015260e060a051015261010060a051015261012060a051015261014060a051015261016060a051015261018060a05101526101a060a05101526101c060a05101526101e060a051015261020060a05101526101605161022060a051015260ff610180511661024060a051015260066101a05110156107b0576101a05161026060a05101526101405161028060a051015260e0516102a060a0510152614ea16080516102c060a051016146c3565b610120516102e060a051015260c05161030060a0510152614ec760196101c05101614623565b61032060a051015260a05190565b60016101a052614cf5565b5060146101c0510154421015614cf0565b5060066101a05110156107b0576101a05115614cea565b506008548111614c8d565b91909392825f52600c60205260405f2091805f1461510a5760098301955b612710614f4060025485614173565b0494612710614f5160035486614173565b04614f608161233389886143d3565b9560028a0199614f71888c546143c6565b97886706f05b59d3b2000001806706f05b59d3b2000011610c63576c02deaf189c140c16b7c528f67960281b92818401808511610c63575f198101908111610c635782614fbd916146fe565b6001820180549093918082111561510157614fd7916143d3565b9b5b8c9f8d1580156150fa575b61141b5755815560038101614ffa8c82546143c6565b8091556969e10de76676d0800000036969e10de76676d08000008111610c63576150339361119c918455600483016124098d82546143c6565b1061140c57615096600792865f146150ca57845f52600f60205260405f2060018060a01b0387165f5260205260405f2061506e8a82546143c6565b90555b600183019960018060a01b038b54165f52601360205260405f206110c18282546143c6565b600b550180549660018801809811610c63578484879261465b9a6150c5955560018060a01b03905416856151ce565b61531f565b845f52601060205260405f2060018060a01b0387165f5260205260405f206150f38a82546143c6565b9055615071565b505f614fe4565b50505f9b614fd9565b600e830195614f31565b61512f615126600954600a54906143c6565b600b54906143c6565b471061140c57565b5f52600c60205260405f206013810190815460ff811660028110156107b05760011461516257505050565b60081c60ff1660068110156107b05715908115826151c0575b61518457505050565b816151b1575b5061519e5763e2c865df60e01b5f5260045ffd5b805461ff001916610100179055806133b7565b6014915001544210158261518a565b50601481015442101561517b565b9092815f52600d60205260405f2091805f52600e60205260405f2060018060a01b0385165f5260205260ff60405f205416156152b8575b501561528f576004810180549060018201809211610c6357556152298482546143c6565b81555b60094291015560018060a01b0316805f52601960205260405f2080549060018201809211610c6357555f52601a60205260405f2061526b8382546143c6565b905560018060a01b03165f52601c60205261528b60405f209182546143c6565b9055565b6005810180549060018201809211610c635755600281016152b18582546143c6565b905561522c565b5f52600e60205260405f2060018060a01b0384165f5260205260405f20600160ff198254161790556006820180549060018201809211610c6357556001600160a01b0383165f908152601b6020526040902080546001810191908210610c6357555f615205565b92907f119770bcf0c9631339b568a4dcc973c3f05919742aafd1488cfab86e81be8fc9929461010092855f52600c60205261535c60405f206153d4565b939092885f52600d60205283600860405f208560078201805482116153cc575b505001805482116153c4575b5050604080519a15158b52600160208c01528a01526060890152608088015260a087015260c08601524260e08601526001600160a01b031693a3565b55835f615388565b55855f61537c565b906009820154670de0b6b3a7640000810290808204670de0b6b3a76400001490151715610c6357600a830154615409916146fe565b91600e810154670de0b6b3a7640000810290808204670de0b6b3a76400001490151715610c6357600f61543e920154906146fe565b9061544982846143c6565b80615455575061138890565b6127108402908482046127101485151715610c6357614350916146fe56fea2646970667358221220d01b5ec0a3e9e908f781b945577862819b64f580ce94dadc3d961a26a645f53264736f6c63430008260033";

export const TIRED_FUN_MARKETS_ABI = NULLHOOD_MARKETS_ABI;
export const TIRED_FUN_MARKETS_BYTECODE = NULLHOOD_MARKETS_BYTECODE;
