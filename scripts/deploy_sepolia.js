const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function waitTx(tx, label = "transaction") {
  if (!tx) return null;
  const hash = tx.hash || tx;
  console.log(`   Waiting for ${label} (${hash.slice(0, 10)}...)...`);
  for (let i = 0; i < 45; i++) {
    const receipt = await hre.ethers.provider.getTransactionReceipt(hash);
    if (receipt) {
      if (receipt.status === 0) throw new Error(`${label} reverted on-chain!`);
      return receipt;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`Timeout waiting for ${label}`);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=================================================");
  console.log("LightVote Sepolia Smart Contract Deployment");
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("=================================================");

  // 1. ElectionManager (already deployed)
  let electionManagerAddress = "0xD25bBb28C28C7CE1153208CEF7133FCF746807F8";
  console.log("\n[1/4] Using deployed ElectionManager at:", electionManagerAddress);
  const ElectionManager = await hre.ethers.getContractFactory("ElectionManager");
  const electionManager = ElectionManager.attach(electionManagerAddress);

  // 2. VoterEligibility (already deployed)
  let voterEligibilityAddress = "0x5C1361fF8dc1b304bc384ee4E32454c7666bbD59";
  console.log("\n[2/4] Using deployed VoterEligibility at:", voterEligibilityAddress);
  const VoterEligibility = await hre.ethers.getContractFactory("VoterEligibility");
  const voterEligibility = VoterEligibility.attach(voterEligibilityAddress);

  // 3. Deploy LightVote
  console.log("\n[3/4] Deploying LightVote...");
  const LightVote = await hre.ethers.getContractFactory("LightVote");
  const lightVote = await LightVote.deploy(electionManagerAddress, voterEligibilityAddress, deployer.address);
  console.log("   Broadcasted tx:", lightVote.deploymentTransaction()?.hash);
  const lvReceipt = await waitTx(lightVote.deploymentTransaction(), "LightVote deployment");
  const lightVoteAddress = await lightVote.getAddress();
  console.log("-> LightVote deployed at:", lightVoteAddress);

  // 4. Deploy ElectionResults
  console.log("\n[4/4] Deploying ElectionResults...");
  const ElectionResults = await hre.ethers.getContractFactory("ElectionResults");
  const electionResults = await ElectionResults.deploy(electionManagerAddress, lightVoteAddress, deployer.address);
  console.log("   Broadcasted tx:", electionResults.deploymentTransaction()?.hash);
  const erReceipt = await waitTx(electionResults.deploymentTransaction(), "ElectionResults deployment");
  const electionResultsAddress = await electionResults.getAddress();
  console.log("-> ElectionResults deployed at:", electionResultsAddress);

  // 5. Grant Contract Roles
  console.log("\n[5/6] Configuring Contract Roles & Permissions...");
  const VOTING_CONTRACT_ROLE = await voterEligibility.VOTING_CONTRACT_ROLE();
  const roleTx1 = await voterEligibility.grantRole(VOTING_CONTRACT_ROLE, lightVoteAddress);
  await waitTx(roleTx1, "grant VOTING_CONTRACT_ROLE");
  console.log("-> Granted VOTING_CONTRACT_ROLE to LightVote");

  const RESULTS_CONTRACT_ROLE = await electionManager.RESULTS_CONTRACT_ROLE();
  const roleTx2 = await electionManager.grantRole(RESULTS_CONTRACT_ROLE, electionResultsAddress);
  await waitTx(roleTx2, "grant RESULTS_CONTRACT_ROLE");
  console.log("-> Granted RESULTS_CONTRACT_ROLE to ElectionResults");

  // 6. Seed Initial 2026 & 2027 Election & Candidates on-chain
  console.log("\n[6/6] Seeding 2026 and 2027 Elections & Candidates on-chain...");
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - 3600;
  const endTime = now + 86400 * 30;

  try {
    const createTx2026 = await electionManager.createElection(
      202601,
      "Tamil Nadu 17th Legislative Assembly General Election 2026",
      2026,
      "Tamil Nadu",
      startTime,
      endTime
    );
    await waitTx(createTx2026, "create Election 202601");
    console.log("-> Created Election 202601 on-chain");
  } catch (err) {
    console.log("   (Election 202601 might already exist on-chain)");
  }

  try {
    const createTx2027 = await electionManager.createElection(
      202701,
      "Tamil Nadu Assembly General / By-Election 2027",
      2027,
      "Tamil Nadu",
      startTime,
      endTime
    );
    await waitTx(createTx2027, "create Election 202701");
    console.log("-> Created Election 202701 on-chain");
  } catch (err) {
    console.log("   (Election 202701 might already exist on-chain)");
  }

  const candidatesData = [
    { name: "S. Kathiravan", party: "DMK", ref: "0x1111111111111111111111111111111111111111111111111111111111111111" },
    { name: "M. Paranthaman", party: "AIADMK", ref: "0x2222222222222222222222222222222222222222222222222222222222222222" },
    { name: "R. Anandha Kumar", party: "NTK", ref: "0x3333333333333333333333333333333333333333333333333333333333333333" },
    { name: "Dr. K. Srinivasan", party: "BJP", ref: "0x4444444444444444444444444444444444444444444444444444444444444444" },
  ];

  for (const c of candidatesData) {
    try {
      const regTx1 = await lightVote.registerCandidate(202601, 29, 141, c.ref, c.name, c.party);
      await waitTx(regTx1, `register 2026 ${c.name}`);
      const regTx2 = await lightVote.registerCandidate(202701, 29, 141, c.ref, c.name, c.party);
      await waitTx(regTx2, `register 2027 ${c.name}`);
      console.log(`-> Registered on-chain: ${c.name} (${c.party})`);
    } catch (err) {
      console.log(`   (Candidate registration note: ${err.message?.slice(0, 60)})`);
    }
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
  if (!fs.existsSync(outputDirFrontend)) fs.mkdirSync(outputDirFrontend, { recursive: true });
  fs.writeFileSync(path.join(outputDirFrontend, "contracts.json"), JSON.stringify(contractsData, null, 2));

  const outputDirBackend = path.join(__dirname, "../backend/contracts_meta");
  if (!fs.existsSync(outputDirBackend)) fs.mkdirSync(outputDirBackend, { recursive: true });
  fs.writeFileSync(path.join(outputDirBackend, "contracts.json"), JSON.stringify(contractsData, null, 2));

  console.log("\n=================================================");
  console.log("Successfully exported Sepolia configuration to frontend and backend!");
  console.log("Contracts deployed on Sepolia:");
  console.log("- ElectionManager:", electionManagerAddress);
  console.log("- VoterEligibility:", voterEligibilityAddress);
  console.log("- LightVote:", lightVoteAddress);
  console.log("- ElectionResults:", electionResultsAddress);
  console.log("=================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("FATAL ERROR IN DEPLOYMENT:", error);
    process.exit(1);
  });
