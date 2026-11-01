const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LightVote Smart Contract Suite", function () {
  let admin, districtAdmin, voter1, voter2, unauthorizedUser;
  let electionManager, voterEligibility, lightVote, electionResults;

  const ELECTION_2026_ID = 202601;
  const ELECTION_2027_ID = 202701;
  const DISTRICT_TRICHY = 16; // Tiruchirappalli
  const CONST_MANACHANALLUR = 141; // Manachanallur
  const CONST_SRIRANGAM = 139; // Srirangam

  async function configureSingleVoterRoot(electionId, constituencyId, nullifierHash) {
    await voterEligibility.setConstituencyMerkleRoot(electionId, constituencyId, nullifierHash);
  }

  beforeEach(async function () {
    [admin, districtAdmin, voter1, voter2, unauthorizedUser] = await ethers.getSigners();

    // 1. Deploy ElectionManager
    const ElectionManagerFactory = await ethers.getContractFactory("ElectionManager");
    electionManager = await ElectionManagerFactory.deploy(admin.address);
    await electionManager.waitForDeployment();

    // 2. Deploy VoterEligibility
    const VoterEligibilityFactory = await ethers.getContractFactory("VoterEligibility");
    voterEligibility = await VoterEligibilityFactory.deploy(
      await electionManager.getAddress(),
      admin.address
    );
    await voterEligibility.waitForDeployment();

    // 3. Deploy LightVote
    const LightVoteFactory = await ethers.getContractFactory("LightVote");
    lightVote = await LightVoteFactory.deploy(
      await electionManager.getAddress(),
      await voterEligibility.getAddress(),
      admin.address
    );
    await lightVote.waitForDeployment();

    // 4. Deploy ElectionResults
    const ElectionResultsFactory = await ethers.getContractFactory("ElectionResults");
    electionResults = await ElectionResultsFactory.deploy(
      await electionManager.getAddress(),
      await lightVote.getAddress(),
      admin.address
    );
    await electionResults.waitForDeployment();

    // 5. Grant contract roles
    const VOTING_CONTRACT_ROLE = await voterEligibility.VOTING_CONTRACT_ROLE();
    await voterEligibility.grantRole(VOTING_CONTRACT_ROLE, await lightVote.getAddress());

    const RESULTS_CONTRACT_ROLE = await electionManager.RESULTS_CONTRACT_ROLE();
    await electionManager.grantRole(RESULTS_CONTRACT_ROLE, await electionResults.getAddress());

    // 6. Assign district admin
    await electionManager.assignDistrictAdmin(districtAdmin.address, DISTRICT_TRICHY);
  });

  describe("1. Election Lifecycle and Access Controls", function () {
    it("should allow Central Admin to create an election", async function () {
      const now = await time.latest();
      const startTime = now + 100;
      const endTime = now + 86400;

      await expect(
        electionManager.createElection(
          ELECTION_2026_ID,
          "Tamil Nadu Assembly General Election 2026",
          2026,
          "Tamil Nadu",
          startTime,
          endTime
        )
      )
        .to.emit(electionManager, "ElectionCreated")
        .withArgs(ELECTION_2026_ID, "Tamil Nadu Assembly General Election 2026", 2026, startTime, endTime);

      const election = await electionManager.elections(ELECTION_2026_ID);
      expect(election.exists).to.be.true;
      expect(election.year).to.equal(2026);
    });

    it("should reject election creation from unauthorized accounts", async function () {
      const now = await time.latest();
      await expect(
        electionManager.connect(unauthorizedUser).createElection(
          ELECTION_2026_ID,
          "Unauthorized Election",
          2026,
          "Tamil Nadu",
          now + 100,
          now + 1000
        )
      ).to.be.revertedWith("Caller is not Central Admin");
    });

    it("should enforce start and end time windows for voting", async function () {
      const now = await time.latest();
      const startTime = now + 500;
      const endTime = now + 1500;

      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Election 2026",
        2026,
        "Tamil Nadu",
        startTime,
        endTime
      );

      // Not open before start time
      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.false;

      // Start election manually
      await electionManager.startElection(ELECTION_2026_ID);

      // Still not open until timestamp reaches startTime
      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.false;

      // Advance time to within window
      await time.increaseTo(startTime + 10);
      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.true;

      // Advance time past endTime
      await time.increaseTo(endTime + 1);
      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.false;
    });

    it("should stop election immediately when administrative stop is invoked", async function () {
      const now = await time.latest();
      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Election 2026",
        2026,
        "Tamil Nadu",
        now - 10,
        now + 3600
      );

      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.true;

      await electionManager.stopElection(ELECTION_2026_ID);
      expect(await electionManager.isElectionOpen(ELECTION_2026_ID)).to.be.false;
    });

    it("should allow a Central Admin to cancel an upcoming election and keep it closed", async function () {
      const now = await time.latest();
      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Election 2026",
        2026,
        "Tamil Nadu",
        now + 100,
        now + 3600
      );

      await expect(electionManager.cancelElection(ELECTION_2026_ID))
        .to.emit(electionManager, "ElectionStatusChanged")
        .withArgs(ELECTION_2026_ID, 0, 5, await time.latest() + 1);
      const election = await electionManager.elections(ELECTION_2026_ID);
      expect(election.status).to.equal(5);
      await expect(electionManager.startElection(ELECTION_2026_ID)).to.be.revertedWith("Election not upcoming");
    });
  });

  describe("2. Candidate Registration and Constituency Scoping", function () {
    beforeEach(async function () {
      const now = await time.latest();
      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Election 2026",
        2026,
        "Tamil Nadu",
        now - 10,
        now + 3600
      );
    });

    it("should register candidates scoped to election and constituency", async function () {
      const candidateRef = ethers.encodeBytes32String("CAND-001");
      const tx = await lightVote.registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY,
        CONST_MANACHANALLUR,
        candidateRef,
        "K. Thangavel",
        "Progressive Democratic Front"
      );

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);

      const cand = await lightVote.getCandidate(1);
      expect(cand.name).to.equal("K. Thangavel");
      expect(cand.constituencyId).to.equal(CONST_MANACHANALLUR);
      expect(cand.isActive).to.be.true;
    });

    it("should allow a district administrator to register candidates only in the assigned district", async function () {
      const candidateRef = ethers.encodeBytes32String("DISTRICT-CAND-001");
      await expect(lightVote.connect(districtAdmin).registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY,
        CONST_MANACHANALLUR,
        candidateRef,
        "District Candidate",
        "Party Green"
      )).to.emit(lightVote, "CandidateRegistered");

      await expect(lightVote.connect(districtAdmin).registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY + 1,
        CONST_MANACHANALLUR,
        candidateRef,
        "Out of District Candidate",
        "Party Green"
      )).to.be.revertedWith("Caller is not authorized for candidate district");
    });
  });

  describe("3. Privacy-Preserving Voting Workflow and Double-Vote Prevention", function () {
    let candidate1Id, candidate2Id;

    beforeEach(async function () {
      const now = await time.latest();
      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Election 2026",
        2026,
        "Tamil Nadu",
        now - 10,
        now + 3600
      );

      // Register candidates
      const tx1 = await lightVote.registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY,
        CONST_MANACHANALLUR,
        ethers.encodeBytes32String("CAND-1"),
        "Candidate A",
        "Party Blue"
      );
      candidate1Id = 1;

      const tx2 = await lightVote.registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY,
        CONST_SRIRANGAM,
        ethers.encodeBytes32String("CAND-2"),
        "Candidate B",
        "Party Green"
      );
      candidate2Id = 2;
    });

    it("should allow eligible voter to cast an anonymous vote with proof", async function () {
      // Secret nullifier generated by voter off-chain
      const voterSecret = ethers.encodeBytes32String("secret-key-1234");
      const nullifierHash = ethers.keccak256(voterSecret);
      await configureSingleVoterRoot(ELECTION_2026_ID, CONST_MANACHANALLUR, nullifierHash);

      // Cast vote
      const tx = await lightVote.connect(voter1).castVote(
        ELECTION_2026_ID,
        CONST_MANACHANALLUR,
        candidate1Id,
        nullifierHash,
        [] // The one-leaf tree root equals the nullifier, so the proof is empty.
      );

      // Verify event: VoteRecorded emits nullifierHash, blockNumber, timestamp - NO candidate choice!
      await expect(tx)
        .to.emit(lightVote, "VoteRecorded")
        .withArgs(
          ELECTION_2026_ID,
          CONST_MANACHANALLUR,
          nullifierHash,
          await ethers.provider.getBlockNumber(),
          await time.latest()
        );

      expect(await lightVote.totalElectionVotes(ELECTION_2026_ID)).to.equal(1);
      expect(await voterEligibility.isNullifierUsed(ELECTION_2026_ID, nullifierHash)).to.be.true;
    });

    it("should prevent double voting using the same nullifier", async function () {
      const voterSecret = ethers.encodeBytes32String("secret-duplicate-test");
      const nullifierHash = ethers.keccak256(voterSecret);
      await configureSingleVoterRoot(ELECTION_2026_ID, CONST_MANACHANALLUR, nullifierHash);

      // First vote succeeds
      await lightVote.connect(voter1).castVote(
        ELECTION_2026_ID,
        CONST_MANACHANALLUR,
        candidate1Id,
        nullifierHash,
        []
      );

      // Second vote with same nullifier MUST revert
      await expect(
        lightVote.connect(voter2).castVote(
          ELECTION_2026_ID,
          CONST_MANACHANALLUR,
          candidate1Id,
          nullifierHash,
          []
        )
      ).to.be.revertedWith("Duplicate vote detected: nullifier already spent");
    });

    it("should reject votes for candidates belonging to a different constituency", async function () {
      const nullifierHash = ethers.keccak256(ethers.encodeBytes32String("cross-constituency-test"));

      // Voter is in Manachanallur (CONST_MANACHANALLUR), but candidate2 is in Srirangam (CONST_SRIRANGAM)
      await expect(
        lightVote.connect(voter1).castVote(
          ELECTION_2026_ID,
          CONST_MANACHANALLUR,
          candidate2Id,
          nullifierHash,
          []
        )
      ).to.be.revertedWith("Candidate not in voter constituency");
    });

    it("should keep candidate tallies confidential until results are published", async function () {
      const nullifierHash = ethers.keccak256(ethers.encodeBytes32String("confidentiality-test"));
      await configureSingleVoterRoot(ELECTION_2026_ID, CONST_MANACHANALLUR, nullifierHash);
      await lightVote.connect(voter1).castVote(
        ELECTION_2026_ID,
        CONST_MANACHANALLUR,
        candidate1Id,
        nullifierHash,
        []
      );

      // Unauthorized public viewer cannot query candidate tally while election is ongoing
      await expect(
        lightVote.connect(unauthorizedUser).getCandidateVotes(ELECTION_2026_ID, candidate1Id)
      ).to.be.revertedWith("Tally is confidential until results are officially published");

      // Central admin CAN query for monitoring
      const adminTally = await lightVote.connect(admin).getCandidateVotes(ELECTION_2026_ID, candidate1Id);
      expect(adminTally).to.equal(1);
    });
  });

  describe("4. Results Publication and Multi-Year Isolation", function () {
    let candidate2026Id, candidate2027Id;

    beforeEach(async function () {
      const now = await time.latest();

      // Election 2026
      await electionManager.createElection(
        ELECTION_2026_ID,
        "TN Assembly Election 2026",
        2026,
        "Tamil Nadu",
        now - 100,
        now + 500
      );

      await lightVote.registerCandidate(
        ELECTION_2026_ID,
        DISTRICT_TRICHY,
        CONST_MANACHANALLUR,
        ethers.encodeBytes32String("CAND-2026"),
        "Candidate 2026",
        "Party Blue"
      );
      candidate2026Id = 1;

      // Cast 1 vote in 2026
      const nullifier2026 = ethers.keccak256(ethers.encodeBytes32String("nullifier-2026"));
      await configureSingleVoterRoot(ELECTION_2026_ID, CONST_MANACHANALLUR, nullifier2026);
      await lightVote.connect(voter1).castVote(
        ELECTION_2026_ID,
        CONST_MANACHANALLUR,
        candidate2026Id,
        nullifier2026,
        []
      );

      // Stop Election 2026
      await electionManager.stopElection(ELECTION_2026_ID);

      // Create Election 2027
      await electionManager.createElection(
        ELECTION_2027_ID,
        "TN Assembly Election 2027",
        2027,
        "Tamil Nadu",
        now - 50,
        now + 3600
      );

      await lightVote.registerCandidate(
        ELECTION_2027_ID,
        DISTRICT_TRICHY,
        CONST_MANACHANALLUR,
        ethers.encodeBytes32String("CAND-2027"),
        "Candidate 2027",
        "Party Green"
      );
      candidate2027Id = 2;
    });

    it("should publish official results and make tallies publicly readable", async function () {
      const mockMerkle = ethers.encodeBytes32String("merkle-root-breakdown");
      await electionResults.publishResults(ELECTION_2026_ID, [candidate2026Id], mockMerkle);

      const official = await electionResults.getOfficialResult(ELECTION_2026_ID);
      expect(official.isPublished).to.be.true;
      expect(official.totalVotes).to.equal(1);
      expect(official.year).to.equal(2026);

      // Public can now query official candidate votes
      const votes = await electionResults.getOfficialCandidateVotes(ELECTION_2026_ID, candidate2026Id);
      expect(votes).to.equal(1);
    });

    it("should guarantee that 2027 election starts with zero votes without affecting 2026", async function () {
      expect(await lightVote.totalElectionVotes(ELECTION_2026_ID)).to.equal(1);
      expect(await lightVote.totalElectionVotes(ELECTION_2027_ID)).to.equal(0);

      // Cast vote in 2027
      const nullifier2027 = ethers.keccak256(ethers.encodeBytes32String("nullifier-2027"));
      await configureSingleVoterRoot(ELECTION_2027_ID, CONST_MANACHANALLUR, nullifier2027);
      await lightVote.connect(voter2).castVote(
        ELECTION_2027_ID,
        CONST_MANACHANALLUR,
        candidate2027Id,
        nullifier2027,
        []
      );

      expect(await lightVote.totalElectionVotes(ELECTION_2027_ID)).to.equal(1);
      expect(await lightVote.totalElectionVotes(ELECTION_2026_ID)).to.equal(1); // Unchanged!
    });
  });
});
