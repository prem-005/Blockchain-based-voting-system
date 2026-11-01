// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ElectionManager.sol";
import "./LightVote.sol";

/**
 * @title ElectionResults
 * @notice Immutable publication and verification of official election tallies.
 * @dev Enforces that results can only be published after election has ended.
 */
contract ElectionResults is AccessControl {
    ElectionManager public immutable electionManager;
    LightVote public immutable lightVote;

    struct FinalResult {
        uint256 electionId;
        uint16 year;
        uint256 totalVotes;
        bytes32 resultsMerkleRoot;
        uint256 publishedAt;
        bool isPublished;
    }

    // electionId => FinalResult
    mapping(uint256 => FinalResult) public electionResults;

    // electionId => candidateId => finalVotes
    mapping(uint256 => mapping(uint256 => uint256)) public officialCandidateVotes;

    event ResultsPublished(
        uint256 indexed electionId,
        uint16 indexed year,
        uint256 totalVotes,
        bytes32 resultsMerkleRoot,
        uint256 publishedAt
    );

    constructor(
        address _electionManagerAddress,
        address _lightVoteAddress,
        address initialAdmin
    ) {
        require(_electionManagerAddress != address(0), "Invalid ElectionManager");
        require(_lightVoteAddress != address(0), "Invalid LightVote");
        require(initialAdmin != address(0), "Invalid admin");

        electionManager = ElectionManager(_electionManagerAddress);
        lightVote = LightVote(_lightVoteAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    modifier onlyCentralAdmin() {
        require(
            electionManager.hasRole(electionManager.CENTRAL_ADMIN_ROLE(), msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not Central Admin"
        );
        _;
    }

    /**
     * @notice Officially publish election results on-chain.
     * @param electionId ID of the election
     * @param candidateIds Array of candidate IDs to freeze tallies for
     * @param resultsMerkleRoot Optional cryptographic commitment of full breakdown
     */
    function publishResults(
        uint256 electionId,
        uint256[] calldata candidateIds,
        bytes32 resultsMerkleRoot
    ) external onlyCentralAdmin {
        require(!electionResults[electionId].isPublished, "Results already officially published");

        // Mark in ElectionManager
        electionManager.markResultsPublished(electionId);

        (, , uint16 year, , , , , , ) = electionManager.elections(electionId);
        uint256 totalVotes = lightVote.totalElectionVotes(electionId);

        // Snapshot candidate tallies
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 cid = candidateIds[i];
            uint256 votes = lightVote.getCandidateVotes(electionId, cid);
            officialCandidateVotes[electionId][cid] = votes;
        }

        electionResults[electionId] = FinalResult({
            electionId: electionId,
            year: year,
            totalVotes: totalVotes,
            resultsMerkleRoot: resultsMerkleRoot,
            publishedAt: block.timestamp,
            isPublished: true
        });

        emit ResultsPublished(electionId, year, totalVotes, resultsMerkleRoot, block.timestamp);
    }

    function getOfficialResult(uint256 electionId) external view returns (
        uint256 id,
        uint16 year,
        uint256 totalVotes,
        bytes32 resultsMerkleRoot,
        uint256 publishedAt,
        bool isPublished
    ) {
        FinalResult storage r = electionResults[electionId];
        require(r.isPublished, "Results not published for this election");
        return (r.electionId, r.year, r.totalVotes, r.resultsMerkleRoot, r.publishedAt, r.isPublished);
    }

    function getOfficialCandidateVotes(uint256 electionId, uint256 candidateId) external view returns (uint256) {
        require(electionResults[electionId].isPublished, "Results not yet published");
        return officialCandidateVotes[electionId][candidateId];
    }
}
