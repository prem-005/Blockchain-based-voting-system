// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ElectionManager.sol";
import "./VoterEligibility.sol";

/**
 * @title LightVote
 * @notice Core electronic voting smart contract with ballot privacy and double-voting prevention.
 * @dev Enforces start/end times, candidate constituency boundaries, and anonymous nullifier validation.
 * Crucially, does NOT emit candidate choices in events or link individual voter identity to candidates.
 */
contract LightVote is AccessControl, ReentrancyGuard {
    ElectionManager public immutable electionManager;
    VoterEligibility public immutable voterEligibility;

    struct Candidate {
        uint256 id;
        bytes32 candidateRef;
        string name;
        string party;
        uint256 electionId;
        uint256 districtId;
        uint256 constituencyId;
        bool isActive;
        bool exists;
    }

    struct VoteAudit {
        uint256 electionId;
        uint256 constituencyId;
        bytes32 nullifierHash;
        uint256 blockNumber;
        uint256 timestamp;
        bool exists;
    }

    // candidateId counter
    uint256 public nextCandidateId = 1;

    // candidateId => Candidate
    mapping(uint256 => Candidate) public candidates;

    // electionId => constituencyId => candidateIds[]
    mapping(uint256 => mapping(uint256 => uint256[])) private constituencyCandidates;

    // electionId => candidateId => tally
    mapping(uint256 => mapping(uint256 => uint256)) private candidateVotes;

    // electionId => total votes
    mapping(uint256 => uint256) public totalElectionVotes;

    // electionId => constituencyId => total votes
    mapping(uint256 => mapping(uint256 => uint256)) public constituencyVotes;

    // Transaction Hash => VoteAudit record
    mapping(bytes32 => VoteAudit) public voteAudits;

    // Events (Privacy Safe: NO candidate selection emitted)
    event CandidateRegistered(
        uint256 indexed candidateId,
        uint256 indexed electionId,
        uint256 indexed constituencyId,
        string name,
        string party
    );
    event CandidateStatusUpdated(uint256 indexed candidateId, bool isActive);
    event VoteRecorded(
        uint256 indexed electionId,
        uint256 indexed constituencyId,
        bytes32 indexed nullifierHash,
        uint256 blockNumber,
        uint256 timestamp
    );

    constructor(
        address _electionManagerAddress,
        address _voterEligibilityAddress,
        address initialAdmin
    ) {
        require(_electionManagerAddress != address(0), "Invalid ElectionManager");
        require(_voterEligibilityAddress != address(0), "Invalid VoterEligibility");
        require(initialAdmin != address(0), "Invalid admin");

        electionManager = ElectionManager(_electionManagerAddress);
        voterEligibility = VoterEligibility(_voterEligibilityAddress);
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

    modifier onlyCandidateAdmin(uint256 districtId) {
        require(
            electionManager.hasRole(electionManager.CENTRAL_ADMIN_ROLE(), msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            (electionManager.hasRole(electionManager.DISTRICT_ADMIN_ROLE(), msg.sender) &&
                electionManager.adminDistrictAssignments(msg.sender) == districtId),
            "Caller is not authorized for candidate district"
        );
        _;
    }

    /**
     * @notice Register a new candidate for a specific election and constituency.
     */
    function registerCandidate(
        uint256 electionId,
        uint256 districtId,
        uint256 constituencyId,
        bytes32 candidateRef,
        string calldata name,
        string calldata party
    ) external onlyCandidateAdmin(districtId) returns (uint256) {
        require(electionId > 0, "Invalid election ID");
        (,,,,,,, bool electionExists,) = electionManager.elections(electionId);
        require(electionExists, "Election not found");
        // Constituency IDs are the official positive IDs supplied by the
        // election catalog (for example, ECI AC numbers), not zero-based indexes.
        require(constituencyId > 0, "Invalid constituency ID");
        require(bytes(name).length > 0, "Candidate name required");
        require(bytes(party).length > 0, "Party required");

        uint256 candidateId = nextCandidateId++;

        candidates[candidateId] = Candidate({
            id: candidateId,
            candidateRef: candidateRef,
            name: name,
            party: party,
            electionId: electionId,
            districtId: districtId,
            constituencyId: constituencyId,
            isActive: true,
            exists: true
        });

        constituencyCandidates[electionId][constituencyId].push(candidateId);

        emit CandidateRegistered(candidateId, electionId, constituencyId, name, party);
        return candidateId;
    }

    /**
     * @notice Toggle candidate active status.
     */
    function setCandidateActive(uint256 candidateId, bool isActive) external {
        Candidate storage candidate = candidates[candidateId];
        require(candidate.exists, "Candidate not found");
        require(
            electionManager.hasRole(electionManager.CENTRAL_ADMIN_ROLE(), msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) ||
            (electionManager.hasRole(electionManager.DISTRICT_ADMIN_ROLE(), msg.sender) &&
                electionManager.adminDistrictAssignments(msg.sender) == candidate.districtId),
            "Caller is not authorized for candidate district"
        );
        candidate.isActive = isActive;
        emit CandidateStatusUpdated(candidateId, isActive);
    }

    /**
     * @notice Cast an anonymous, privacy-preserving vote.
     * @param electionId Target election ID
     * @param constituencyId Voter's registered constituency ID
     * @param candidateId Chosen candidate ID
     * @param nullifierHash Secret nullifier hash for double-voting prevention
     * @param merkleProof Cryptographic Merkle inclusion proof
     */
    function castVote(
        uint256 electionId,
        uint256 constituencyId,
        uint256 candidateId,
        bytes32 nullifierHash,
        bytes32[] calldata merkleProof
    ) external nonReentrant returns (bytes32) {
        // 1. Verify election is open and active
        require(electionManager.isElectionOpen(electionId), "Voting closed: election not currently active");

        // 2. Validate candidate
        Candidate storage candidate = candidates[candidateId];
        require(candidate.exists, "Candidate does not exist");
        require(candidate.isActive, "Candidate is not active");
        require(candidate.electionId == electionId, "Candidate not enrolled in this election");
        require(candidate.constituencyId == constituencyId, "Candidate not in voter constituency");

        // 3. Verify voter eligibility and prevent double voting via nullifier
        bool eligibilityVerified = voterEligibility.verifyAndConsumeNullifier(
            electionId,
            constituencyId,
            nullifierHash,
            merkleProof
        );
        require(eligibilityVerified, "Voter eligibility verification failed");

        // 4. Record tally
        candidateVotes[electionId][candidateId]++;
        totalElectionVotes[electionId]++;
        constituencyVotes[electionId][constituencyId]++;

        // 5. Generate deterministic audit reference
        bytes32 auditRef = keccak256(
            abi.encodePacked(electionId, constituencyId, nullifierHash, block.number, block.timestamp)
        );

        voteAudits[auditRef] = VoteAudit({
            electionId: electionId,
            constituencyId: constituencyId,
            nullifierHash: nullifierHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            exists: true
        });

        // 6. Emit privacy-preserving event (excludes candidateId and sender identity link)
        emit VoteRecorded(electionId, constituencyId, nullifierHash, block.number, block.timestamp);

        return auditRef;
    }

    /**
     * @notice Get candidate votes.
     * @dev Gated: Only accessible after results are published OR by Central Admin.
     */
    function getCandidateVotes(uint256 electionId, uint256 candidateId) external view returns (uint256) {
        bool isPublished = electionManager.isResultsPublished(electionId);
        bool isAdmin = electionManager.hasRole(electionManager.CENTRAL_ADMIN_ROLE(), msg.sender);
        require(isPublished || isAdmin, "Tally is confidential until results are officially published");

        return candidateVotes[electionId][candidateId];
    }

    /**
     * @notice Get candidate IDs for a constituency.
     */
    function getConstituencyCandidates(
        uint256 electionId,
        uint256 constituencyId
    ) external view returns (uint256[] memory) {
        return constituencyCandidates[electionId][constituencyId];
    }

    /**
     * @notice Retrieve candidate details.
     */
    function getCandidate(uint256 candidateId) external view returns (
        uint256 id,
        bytes32 candidateRef,
        string memory name,
        string memory party,
        uint256 electionId,
        uint256 districtId,
        uint256 constituencyId,
        bool isActive
    ) {
        Candidate storage c = candidates[candidateId];
        require(c.exists, "Candidate does not exist");
        return (
            c.id,
            c.candidateRef,
            c.name,
            c.party,
            c.electionId,
            c.districtId,
            c.constituencyId,
            c.isActive
        );
    }

    /**
     * @notice Verify a vote audit entry exists for receipt validation.
     */
    function verifyVoteAudit(bytes32 auditRef) external view returns (
        bool exists,
        uint256 electionId,
        uint256 constituencyId,
        bytes32 nullifierHash,
        uint256 blockNumber,
        uint256 timestamp
    ) {
        VoteAudit storage audit = voteAudits[auditRef];
        return (
            audit.exists,
            audit.electionId,
            audit.constituencyId,
            audit.nullifierHash,
            audit.blockNumber,
            audit.timestamp
        );
    }
}
