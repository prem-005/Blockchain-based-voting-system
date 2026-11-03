// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IEligibilityRootWriter {
    function setConstituencyMerkleRoot(
        uint256 electionId,
        uint256 constituencyId,
        bytes32 merkleRoot
    ) external;
}

/**
 * @title EligibilityRootBatcher
 * @notice Atomically publishes many eligibility roots through an existing VoterEligibility deployment.
 * @dev The batcher address must be granted CENTRAL_ADMIN_ROLE on the linked ElectionManager.
 */
contract EligibilityRootBatcher {
    address public immutable administrator;
    address public immutable electionManager;
    IEligibilityRootWriter public immutable voterEligibility;

    constructor(address _administrator, address _electionManager, address _voterEligibility) {
        require(_administrator != address(0), "Invalid administrator");
        require(_electionManager != address(0), "Invalid ElectionManager");
        require(_voterEligibility != address(0), "Invalid VoterEligibility");
        administrator = _administrator;
        electionManager = _electionManager;
        voterEligibility = IEligibilityRootWriter(_voterEligibility);
    }

    modifier onlyAdministrator() {
        require(msg.sender == administrator, "Caller is not batch administrator");
        _;
    }

    function publishRoots(
        uint256 electionId,
        uint256[] calldata constituencyIds,
        bytes32[] calldata merkleRoots
    ) external onlyAdministrator {
        require(constituencyIds.length == merkleRoots.length, "Array length mismatch");
        require(constituencyIds.length > 0, "No roots provided");

        for (uint256 i = 0; i < constituencyIds.length; i++) {
            voterEligibility.setConstituencyMerkleRoot(
                electionId,
                constituencyIds[i],
                merkleRoots[i]
            );
        }
    }
}
