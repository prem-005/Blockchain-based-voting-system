// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./ElectionManager.sol";

/**
 * @title VoterEligibility
 * @notice Privacy-preserving voter eligibility verification and double-voting prevention.
 * @dev Employs Merkle roots of anonymous commitments and cryptographic nullifiers.
 * Does NOT store names, voter IDs, emails, mobile numbers, or voter-to-candidate links.
 */
contract VoterEligibility is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant VOTING_CONTRACT_ROLE = keccak256("VOTING_CONTRACT_ROLE");

    ElectionManager public immutable electionManager;

    // electionId => constituencyId => Merkle Root of approved voter commitments
    mapping(uint256 => mapping(uint256 => bytes32)) public constituencyMerkleRoots;

    // electionId => nullifierHash => hasVoted boolean
    mapping(uint256 => mapping(bytes32 => bool)) public hasVotedNullifier;

    // Total nullifiers consumed per election
    mapping(uint256 => uint256) public electionVoteCount;

    // Events
    event MerkleRootUpdated(uint256 indexed electionId, uint256 indexed constituencyId, bytes32 newRoot);
    event NullifierConsumed(uint256 indexed electionId, uint256 indexed constituencyId, bytes32 indexed nullifierHash);

    constructor(address _electionManagerAddress, address initialAdmin) {
        require(_electionManagerAddress != address(0), "Invalid ElectionManager");
        require(initialAdmin != address(0), "Invalid Admin");

        electionManager = ElectionManager(_electionManagerAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    modifier onlyAuthorizedAdmin() {
        require(
            electionManager.hasRole(electionManager.CENTRAL_ADMIN_ROLE(), msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Caller is not authorized election administrator"
        );
        _;
    }

    modifier onlyVotingContract() {
        require(hasRole(VOTING_CONTRACT_ROLE, msg.sender), "Caller is not authorized voting contract");
        _;
    }

    /**
     * @notice Set or update the Merkle root of approved anonymous voter commitments for an election and constituency.
     */
    function setConstituencyMerkleRoot(
        uint256 electionId,
        uint256 constituencyId,
        bytes32 merkleRoot
    ) external onlyAuthorizedAdmin {
        require(merkleRoot != bytes32(0), "Invalid Merkle root");
        constituencyMerkleRoots[electionId][constituencyId] = merkleRoot;
        emit MerkleRootUpdated(electionId, constituencyId, merkleRoot);
    }

    /**
     * @notice Set or update multiple constituency roots for one election in a single transaction.
     */
    function setConstituencyMerkleRoots(
        uint256 electionId,
        uint256[] calldata constituencyIds,
        bytes32[] calldata merkleRoots
    ) external onlyAuthorizedAdmin {
        require(constituencyIds.length == merkleRoots.length, "Array length mismatch");
        require(constituencyIds.length > 0, "No roots provided");

        for (uint256 i = 0; i < constituencyIds.length; i++) {
            require(merkleRoots[i] != bytes32(0), "Invalid Merkle root");
            constituencyMerkleRoots[electionId][constituencyIds[i]] = merkleRoots[i];
            emit MerkleRootUpdated(electionId, constituencyIds[i], merkleRoots[i]);
        }
    }

    /**
     * @notice Verifies whether a nullifier is unused in an election.
     */
    function isNullifierUsed(uint256 electionId, bytes32 nullifierHash) external view returns (bool) {
        return hasVotedNullifier[electionId][nullifierHash];
    }

    /**
     * @notice Verifies voter eligibility and consumes the nullifier to prevent double voting.
     * @dev Called exclusively by the LightVote contract.
     * @param electionId ID of the election
     * @param constituencyId Constituency of the voter
     * @param nullifierHash Hash of the voter's secret nullifier
     * @param merkleProof Merkle inclusion proof of the voter's commitment (or empty if direct voucher mode is used)
     */
    function verifyAndConsumeNullifier(
        uint256 electionId,
        uint256 constituencyId,
        bytes32 nullifierHash,
        bytes32[] calldata merkleProof
    ) external onlyVotingContract returns (bool) {
        require(nullifierHash != bytes32(0), "Invalid nullifier hash");
        require(!hasVotedNullifier[electionId][nullifierHash], "Duplicate vote detected: nullifier already spent");

        bytes32 root = constituencyMerkleRoots[electionId][constituencyId];
        require(root != bytes32(0), "Eligibility root not configured");
        bool isValidProof = MerkleProof.verify(merkleProof, root, nullifierHash);
        require(isValidProof, "Invalid eligibility proof for this constituency");

        // Mark nullifier as consumed
        hasVotedNullifier[electionId][nullifierHash] = true;
        electionVoteCount[electionId]++;

        emit NullifierConsumed(electionId, constituencyId, nullifierHash);
        return true;
    }
}
