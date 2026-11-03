const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  if (chainId !== 11155111n) {
    throw new Error(`Expected Sepolia (11155111), connected to chain ${chainId}.`);
  }

  const frontendConfigPath = path.join(__dirname, "../frontend/src/contracts/contracts.json");
  const contracts = JSON.parse(fs.readFileSync(frontendConfigPath, "utf8"));
  const electionManagerAddress = process.env.VITE_ELECTION_MANAGER_ADDRESS || contracts.ElectionManager.address;
  const voterEligibilityAddress = process.env.VITE_VOTER_ELIGIBILITY_ADDRESS || contracts.VoterEligibility.address;
  const administrator = hre.ethers.getAddress(process.env.ELIGIBILITY_ROOT_BATCHER_ADMIN || deployer.address);
  if (!electionManagerAddress || !voterEligibilityAddress) {
    throw new Error("ElectionManager and VoterEligibility addresses must be configured.");
  }

  const managerArtifact = require("../artifacts/contracts/ElectionManager.sol/ElectionManager.json");
  const manager = new hre.ethers.Contract(electionManagerAddress, managerArtifact.abi, deployer);
  const centralAdminRole = await manager.CENTRAL_ADMIN_ROLE();
  if (!(await manager.hasRole(centralAdminRole, deployer.address))) {
    throw new Error(`${deployer.address} does not have CENTRAL_ADMIN_ROLE on the configured ElectionManager.`);
  }
  if (!(await manager.hasRole(centralAdminRole, administrator))) {
    throw new Error(`${administrator} must have CENTRAL_ADMIN_ROLE to use the root batcher.`);
  }
  const centralAdminRoleAdmin = await manager.getRoleAdmin(centralAdminRole);
  if (!(await manager.hasRole(centralAdminRoleAdmin, deployer.address))) {
    throw new Error(`${deployer.address} cannot grant CENTRAL_ADMIN_ROLE to the batcher.`);
  }

  const BatchFactory = await hre.ethers.getContractFactory("EligibilityRootBatcher");
  const batcher = await BatchFactory.deploy(administrator, electionManagerAddress, voterEligibilityAddress);
  await batcher.waitForDeployment();
  const batcherAddress = await batcher.getAddress();
  console.log(`EligibilityRootBatcher deployed at ${batcherAddress}`);

  if (!(await manager.hasRole(centralAdminRole, batcherAddress))) {
    const grantTx = await manager.grantRole(centralAdminRole, batcherAddress);
    await grantTx.wait();
    console.log(`Granted CENTRAL_ADMIN_ROLE to ${batcherAddress}`);
  }

  const artifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "../artifacts/contracts/EligibilityRootBatcher.sol/EligibilityRootBatcher.json"),
    "utf8"
  ));
  contracts.EligibilityRootBatcher = { address: batcherAddress, abi: artifact.abi };
  for (const outputPath of [
    frontendConfigPath,
    path.join(__dirname, "../backend/contracts_meta/contracts.json"),
  ]) {
    fs.writeFileSync(outputPath, `${JSON.stringify(contracts, null, 2)}\n`);
  }
  console.log("Updated frontend and backend contract configuration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
