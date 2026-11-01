// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ElectionManager
 * @notice Governs election lifecycle, administration roles, and time enforcement.
 * @dev Employs OpenZeppelin AccessControl. Strictly isolates historical election cycles (2026, 2027, etc.).
 */
contract ElectionManager is AccessControl {
    bytes32 public constant CENTRAL_ADMIN_ROLE = keccak256("CENTRAL_ADMIN_ROLE");
    bytes32 public constant DISTRICT_ADMIN_ROLE = keccak256("DISTRICT_ADMIN_ROLE");

    enum ElectionStatus {
        UPCOMING,          // 0
        ACTIVE,            // 1
        ENDED,             // 2
        RESULTS_PUBLISHED, // 3
        ARCHIVED,          // 4
        CANCELLED          // 5
    }

    struct Election {
        uint256 id;
        string name;
        uint16 year;
        string state;
        uint256 startTime;
        uint256 endTime;
        ElectionStatus status;
        bool exists;
        uint256 createdAt;
    }

    // electionId => Election
    mapping(uint256 => Election) public elections;
    uint256[] public electionIds;

    // Admin address => District ID mapping
    mapping(address => uint256) public adminDistrictAssignments;

    // Events
    event ElectionCreated(
        uint256 indexed electionId,
        string name,
        uint16 indexed year,
        uint256 startTime,
        uint256 endTime
    );
    event ElectionStatusChanged(
        uint256 indexed electionId,
        ElectionStatus previousStatus,
        ElectionStatus newStatus,
        uint256 timestamp
    );
    event DistrictAdminAssigned(address indexed admin, uint256 indexed districtId);
    event DistrictAdminRevoked(address indexed admin, uint256 indexed districtId);

    constructor(address initialCentralAdmin) {
        require(initialCentralAdmin != address(0), "Invalid admin address");
        _grantRole(DEFAULT_ADMIN_ROLE, initialCentralAdmin);
        _grantRole(CENTRAL_ADMIN_ROLE, initialCentralAdmin);
    }

    modifier onlyCentralAdmin() {
        require(hasRole(CENTRAL_ADMIN_ROLE, msg.sender), "Caller is not Central Admin");
        _;
    }

    /**
     * @notice Create a new election cycle.
     * @param electionId Unique numeric election identifier
     * @param name Name of the election (e.g. "Tamil Nadu Legislative Assembly Election 2026")
     * @param year Election year (e.g. 2026)
     * @param state State name (e.g. "Tamil Nadu")
     * @param startTime Unix timestamp when voting opens
     * @param endTime Unix timestamp when voting closes
     */
    function createElection(
        uint256 electionId,
        string calldata name,
        uint16 year,
        string calldata state,
        uint256 startTime,
        uint256 endTime
    ) external onlyCentralAdmin {
        require(electionId > 0, "Invalid election ID");
        require(!elections[electionId].exists, "Election already exists");
        require(bytes(name).length > 0, "Election name required");
        require(endTime > startTime, "End time must be after start time");

        ElectionStatus initialStatus = ElectionStatus.UPCOMING;
        if (block.timestamp >= startTime && block.timestamp <= endTime) {
            initialStatus = ElectionStatus.ACTIVE;
        }

        elections[electionId] = Election({
            id: electionId,
            name: name,
            year: year,
            state: state,
            startTime: startTime,
            endTime: endTime,
            status: initialStatus,
            exists: true,
            createdAt: block.timestamp
        });

        electionIds.push(electionId);

        emit ElectionCreated(electionId, name, year, startTime, endTime);
        if (initialStatus == ElectionStatus.ACTIVE) {
            emit ElectionStatusChanged(electionId, ElectionStatus.UPCOMING, ElectionStatus.ACTIVE, block.timestamp);
        }
    }

    /**
     * @notice Manually start an election before or at scheduled start time.
     */
    function startElection(uint256 electionId) external onlyCentralAdmin {
        Election storage election = elections[electionId];
        require(election.exists, "Election not found");
        require(election.status == ElectionStatus.UPCOMING, "Election not upcoming");
        require(block.timestamp <= election.endTime, "Election end time already passed");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.ACTIVE;

        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.ACTIVE, block.timestamp);
    }

    /**
     * @notice Stop an active election immediately.
     */
    function stopElection(uint256 electionId) external onlyCentralAdmin {
        Election storage election = elections[electionId];
        require(election.exists, "Election not found");
        require(election.status == ElectionStatus.ACTIVE, "Election not active");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.ENDED;

        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.ENDED, block.timestamp);
    }

    bytes32 public constant RESULTS_CONTRACT_ROLE = keccak256("RESULTS_CONTRACT_ROLE");

    /**
     * @notice Set status to RESULTS_PUBLISHED after election has ended.
     */
    function markResultsPublished(uint256 electionId) external {
        require(
            hasRole(CENTRAL_ADMIN_ROLE, msg.sender) ||
            hasRole(RESULTS_CONTRACT_ROLE, msg.sender),
            "Caller is not authorized to mark results published"
        );
        Election storage election = elections[electionId];
        require(election.exists, "Election not found");
        require(
            election.status == ElectionStatus.ENDED ||
            (election.status == ElectionStatus.ACTIVE && block.timestamp > election.endTime),
            "Election has not ended"
        );

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.RESULTS_PUBLISHED;

        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.RESULTS_PUBLISHED, block.timestamp);
    }

    /**
     * @notice Archive election after results publication.
     */
    function archiveElection(uint256 electionId) external onlyCentralAdmin {
        Election storage election = elections[electionId];
        require(election.exists, "Election not found");
        require(election.status == ElectionStatus.RESULTS_PUBLISHED, "Results not yet published");

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.ARCHIVED;

        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.ARCHIVED, block.timestamp);
    }

    /**
     * @notice Cancel an upcoming or active election while preserving its audit history.
     */
    function cancelElection(uint256 electionId) external onlyCentralAdmin {
        Election storage election = elections[electionId];
        require(election.exists, "Election not found");
        require(
            election.status == ElectionStatus.UPCOMING || election.status == ElectionStatus.ACTIVE,
            "Only upcoming or active elections can be cancelled"
        );

        ElectionStatus oldStatus = election.status;
        election.status = ElectionStatus.CANCELLED;
        emit ElectionStatusChanged(electionId, oldStatus, ElectionStatus.CANCELLED, block.timestamp);
    }

    /**
     * @notice Checks if an election is currently open for voting.
     * @dev Evaluates both administrative status and block timestamp window.
     */
    function isElectionOpen(uint256 electionId) external view returns (bool) {
        Election storage election = elections[electionId];
        if (!election.exists) return false;
        if (election.status != ElectionStatus.ACTIVE) return false;
        if (block.timestamp < election.startTime || block.timestamp > election.endTime) return false;
        return true;
    }

    function isResultsPublished(uint256 electionId) external view returns (bool) {
        return elections[electionId].status == ElectionStatus.RESULTS_PUBLISHED ||
               elections[electionId].status == ElectionStatus.ARCHIVED;
    }

    function assignDistrictAdmin(address admin, uint256 districtId) external onlyCentralAdmin {
        require(admin != address(0), "Invalid admin address");
        require(districtId > 0, "Invalid district ID");

        _grantRole(DISTRICT_ADMIN_ROLE, admin);
        adminDistrictAssignments[admin] = districtId;

        emit DistrictAdminAssigned(admin, districtId);
    }

    function revokeDistrictAdmin(address admin) external onlyCentralAdmin {
        uint256 districtId = adminDistrictAssignments[admin];
        _revokeRole(DISTRICT_ADMIN_ROLE, admin);
        delete adminDistrictAssignments[admin];

        emit DistrictAdminRevoked(admin, districtId);
    }

    function getElectionCount() external view returns (uint256) {
        return electionIds.length;
    }

    function getAllElectionIds() external view returns (uint256[] memory) {
        return electionIds;
    }
}
