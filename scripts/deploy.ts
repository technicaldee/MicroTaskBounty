import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy contracts in order
  console.log("\n1. Deploying AntiFraud...");
  const AntiFraud = await ethers.getContractFactory("AntiFraud");
  const antiFraud = await AntiFraud.deploy();
  await antiFraud.waitForDeployment();
  const antiFraudAddress = await antiFraud.getAddress();
  console.log("AntiFraud deployed to:", antiFraudAddress);

  console.log("\n2. Deploying ReputationContract...");
  const ReputationContract = await ethers.getContractFactory("ReputationContract");
  const reputationContract = await ReputationContract.deploy();
  await reputationContract.waitForDeployment();
  const reputationContractAddress = await reputationContract.getAddress();
  console.log("ReputationContract deployed to:", reputationContractAddress);

  console.log("\n3. Deploying BountyPool...");
  const BountyPool = await ethers.getContractFactory("BountyPool");
  const bountyPool = await BountyPool.deploy();
  await bountyPool.waitForDeployment();
  const bountyPoolAddress = await bountyPool.getAddress();
  console.log("BountyPool deployed to:", bountyPoolAddress);

  console.log("\n4. Deploying VerificationContract...");
  const VerificationContract = await ethers.getContractFactory("VerificationContract");
  const verificationContract = await VerificationContract.deploy();
  await verificationContract.waitForDeployment();
  const verificationContractAddress = await verificationContract.getAddress();
  console.log("VerificationContract deployed to:", verificationContractAddress);

  console.log("\n5. Deploying TaskManager...");
  const TaskManager = await ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy();
  await taskManager.waitForDeployment();
  const taskManagerAddress = await taskManager.getAddress();
  console.log("TaskManager deployed to:", taskManagerAddress);

  // Set up contract interconnections
  console.log("\n6. Setting up contract interconnections...");
  
  console.log("  - Setting AntiFraud addresses...");
  await antiFraud.setTaskManager(taskManagerAddress);
  await antiFraud.setVerificationContract(verificationContractAddress);

  console.log("  - Setting BountyPool addresses...");
  await bountyPool.setTaskManager(taskManagerAddress);
  await bountyPool.setVerificationContract(verificationContractAddress);

  console.log("  - Setting VerificationContract addresses...");
  await verificationContract.setBountyPool(bountyPoolAddress);
  await verificationContract.setReputationContract(reputationContractAddress);
  await verificationContract.setTaskManager(taskManagerAddress);
  await verificationContract.setAntiFraud(antiFraudAddress);

  console.log("  - Setting ReputationContract addresses...");
  await reputationContract.setVerificationContract(verificationContractAddress);
  await reputationContract.setTaskManager(taskManagerAddress);

  console.log("  - Setting TaskManager addresses...");
  await taskManager.setAntiFraud(antiFraudAddress);

  console.log("\n✅ All contracts deployed and configured!");

  // Save deployment addresses
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AntiFraud: antiFraudAddress,
      ReputationContract: reputationContractAddress,
      BountyPool: bountyPoolAddress,
      VerificationContract: verificationContractAddress,
      TaskManager: taskManagerAddress,
    },
    timestamp: new Date().toISOString(),
  };

  // Use process.cwd() for deployment path
  const deploymentPath = path.resolve(process.cwd(), "deployments.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📝 Deployment info saved to:", deploymentPath);

  // Also save to web-app/public/deployments.json for the web app
  const webAppDeploymentPath = path.resolve(process.cwd(), "web-app/public/deployments.json");
  fs.writeFileSync(webAppDeploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📝 Deployment info also saved to:", webAppDeploymentPath);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network:", deploymentInfo.network);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("\nContract Addresses:");
  Object.entries(deploymentInfo.contracts).forEach(([name, address]) => {
    console.log(`  ${name}: ${address}`);
  });
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

