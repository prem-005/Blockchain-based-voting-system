const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=================================================");
  console.log("LightVote Smart Contract Deployment");
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("=================================================");

  // 1. Deploy ElectionManager
  console.log("\n[1/4] Deploying ElectionManager...");
  const ElectionManager = await hre.ethers.getContractFactory("ElectionManager");
  const electionManager = await ElectionManager.deploy(deployer.address);
  await electionManager.waitForDeployment();
  const electionManagerAddress = await electionManager.getAddress();
  console.log("-> ElectionManager deployed at:", electionManagerAddress);

  // 2. Deploy VoterEligibility
  console.log("\n[2/4] Deploying VoterEligibility...");
  const VoterEligibility = await hre.ethers.getContractFactory("VoterEligibility");
  const voterEligibility = await VoterEligibility.deploy(electionManagerAddress, deployer.address);
  await voterEligibility.waitForDeployment();
  const voterEligibilityAddress = await voterEligibility.getAddress();
  console.log("-> VoterEligibility deployed at:", voterEligibilityAddress);

  // 3. Deploy LightVote
  console.log("\n[3/4] Deploying LightVote...");
  const LightVote = await hre.ethers.getContractFactory("LightVote");
  const lightVote = await LightVote.deploy(electionManagerAddress, voterEligibilityAddress, deployer.address);
  await lightVote.waitForDeployment();
  const lightVoteAddress = await lightVote.getAddress();
  console.log("-> LightVote deployed at:", lightVoteAddress);

  // 4. Deploy ElectionResults
  console.log("\n[4/4] Deploying ElectionResults...");
  const ElectionResults = await hre.ethers.getContractFactory("ElectionResults");
  const electionResults = await ElectionResults.deploy(electionManagerAddress, lightVoteAddress, deployer.address);
  await electionResults.waitForDeployment();
  const electionResultsAddress = await electionResults.getAddress();
  console.log("-> ElectionResults deployed at:", electionResultsAddress);

  // 5. Grant Contract Roles
  console.log("\n[5/5] Configuring Contract Roles & Permissions...");
  const VOTING_CONTRACT_ROLE = await voterEligibility.VOTING_CONTRACT_ROLE();
  const roleTx1 = await voterEligibility.grantRole(VOTING_CONTRACT_ROLE, lightVoteAddress);
  await roleTx1.wait();
  console.log("-> Granted VOTING_CONTRACT_ROLE to LightVote");

  const RESULTS_CONTRACT_ROLE = await electionManager.RESULTS_CONTRACT_ROLE();
  const roleTx2 = await electionManager.grantRole(RESULTS_CONTRACT_ROLE, electionResultsAddress);
  await roleTx2.wait();
  console.log("-> Granted RESULTS_CONTRACT_ROLE to ElectionResults");

  // 6. Seed Initial 2026 & 2027 Election & Candidates on-chain
  console.log("\n[6/6] Seeding 2026 and 2027 Elections & Candidates on-chain...");
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - 3600; // Started 1 hour ago
  const endTime = now + 86400 * 30; // Ends in 30 days

  // Election 202601
  const createTx2026 = await electionManager.createElection(
    202601,
    "Tamil Nadu 17th Legislative Assembly General Election 2026",
    2026,
    "Tamil Nadu",
    startTime,
    endTime
  );
  await createTx2026.wait();
  console.log("-> Created Election 202601 on-chain");

  // Election 202701 (Active)
  const createTx2027 = await electionManager.createElection(
    202701,
    "Tamil Nadu Assembly General / By-Election 2027",
    2027,
    "Tamil Nadu",
    startTime,
    endTime
  );
  await createTx2027.wait();
  console.log("-> Created Election 202701 on-chain");

  const candidatesData = [
    { name: "S. Kathiravan", party: "DMK", ref: "0x1111111111111111111111111111111111111111111111111111111111111111" },
    { name: "M. Paranthaman", party: "AIADMK", ref: "0x2222222222222222222222222222222222222222222222222222222222222222" },
    { name: "R. Anandha Kumar", party: "NTK", ref: "0x3333333333333333333333333333333333333333333333333333333333333333" },
    { name: "Dr. K. Srinivasan", party: "BJP", ref: "0x4444444444444444444444444444444444444444444444444444444444444444" },
  ];

  for (const c of candidatesData) {
    const regTx1 = await lightVote.registerCandidate(202601, 29, 141, c.ref, c.name, c.party);
    await regTx1.wait();
    const regTx2 = await lightVote.registerCandidate(202701, 29, 141, c.ref, c.name, c.party);
    await regTx2.wait();
    console.log(`-> Registered on-chain (2026 & 2027): ${c.name} (${c.party})`);
  }

  // Save contract artifact addresses and ABIs for frontend and backend
  const contractsData = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    ElectionManager: {
      address: electionManagerAddress,
      abi: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ElectionManager.sol/ElectionManager.json"))).abi
    },
    VoterEligibility: {
      address: voterEligibilityAddress,
      abi: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/VoterEligibility.sol/VoterEligibility.json"))).abi
    },
    LightVote: {
      address: lightVoteAddress,
      abi: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/LightVote.sol/LightVote.json"))).abi
    },
    ElectionResults: {
      address: electionResultsAddress,
      abi: JSON.parse(fs.readFileSync(path.join(__dirname, "../artifacts/contracts/ElectionResults.sol/ElectionResults.json"))).abi
    }
  };

  const outputDirFrontend = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(outputDirFrontend)) {
    fs.mkdirSync(outputDirFrontend, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputDirFrontend, "contracts.json"),
    JSON.stringify(contractsData, null, 2)
  );

  const outputDirBackend = path.join(__dirname, "../backend/contracts_meta");
  if (!fs.existsSync(outputDirBackend)) {
    fs.mkdirSync(outputDirBackend, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outputDirBackend, "contracts.json"),
    JSON.stringify(contractsData, null, 2)
  );

  console.log("\nSuccessfully exported contracts configuration to frontend and backend!");
  console.log("=================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
