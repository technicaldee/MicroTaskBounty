import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

// Demo tasks for hackathon presentation
const DEMO_TASKS = [
  {
    description: "Take a photo of the storefront sign at the new coffee shop on Main Street",
    category: 0, // PHOTO_VERIFICATION
    bountyAmount: "1.5", // cUSD
    maxWorkers: 3,
    location: {
      latitude: 37.7749, // San Francisco coordinates (example)
      longitude: -122.4194,
      radius: 50, // 50 meters
    },
    deadlineHours: 48, // 48 hours from now
    requirements: {
      photoCount: 2,
      requiresLocation: true,
      minReputation: 0,
      requiredBadge: 0,
    },
  },
  {
    description: "Verify the current price of premium gasoline at the Shell station on Highway 101",
    category: 3, // PRICE_MONITORING
    bountyAmount: "2.0",
    maxWorkers: 5,
    location: {
      latitude: 37.7849,
      longitude: -122.4094,
      radius: 100,
    },
    deadlineHours: 24,
    requirements: {
      photoCount: 1,
      requiresLocation: true,
      minReputation: 10,
      requiredBadge: 0,
    },
  },
  {
    description: "Check if the local library is open and take a photo of the operating hours sign",
    category: 4, // BUSINESS_HOURS
    bountyAmount: "1.0",
    maxWorkers: 2,
    location: {
      latitude: 37.7649,
      longitude: -122.4294,
      radius: 75,
    },
    deadlineHours: 12,
    requirements: {
      photoCount: 1,
      requiresLocation: true,
      minReputation: 0,
      requiredBadge: 0,
    },
  },
  {
    description: "Survey: Count the number of parking spaces available in the downtown parking lot",
    category: 2, // SURVEY
    bountyAmount: "1.2",
    maxWorkers: 4,
    location: {
      latitude: 37.7949,
      longitude: -122.3994,
      radius: 200,
    },
    deadlineHours: 36,
    requirements: {
      photoCount: 3,
      requiresLocation: true,
      minReputation: 5,
      requiredBadge: 0,
    },
  },
  {
    description: "Verify the location and condition of the community garden at the park entrance",
    category: 1, // LOCATION_CHECK
    bountyAmount: "1.8",
    maxWorkers: 3,
    location: {
      latitude: 37.7549,
      longitude: -122.4394,
      radius: 150,
    },
    deadlineHours: 72,
    requirements: {
      photoCount: 2,
      requiresLocation: true,
      minReputation: 0,
      requiredBadge: 0,
    },
  },
  {
    description: "Document the menu board prices at the popular taco truck on Market Street",
    category: 3, // PRICE_MONITORING
    bountyAmount: "2.5",
    maxWorkers: 6,
    location: {
      latitude: 37.8049,
      longitude: -122.4094,
      radius: 30,
    },
    deadlineHours: 18,
    requirements: {
      photoCount: 2,
      requiresLocation: true,
      minReputation: 15,
      requiredBadge: 0,
    },
  },
  {
    description: "Take photos of the new mural artwork on the side of the community center",
    category: 0, // PHOTO_VERIFICATION
    bountyAmount: "1.3",
    maxWorkers: 4,
    location: {
      latitude: 37.7849,
      longitude: -122.4194,
      radius: 40,
    },
    deadlineHours: 60,
    requirements: {
      photoCount: 3,
      requiresLocation: true,
      minReputation: 0,
      requiredBadge: 0,
    },
  },
  {
    description: "Check if the farmers market is currently operating and document vendor count",
    category: 4, // BUSINESS_HOURS
    bountyAmount: "1.7",
    maxWorkers: 3,
    location: {
      latitude: 37.7749,
      longitude: -122.4294,
      radius: 250,
    },
    deadlineHours: 6,
    requirements: {
      photoCount: 2,
      requiresLocation: true,
      minReputation: 20,
      requiredBadge: 0,
    },
  },
];

async function main() {
  // Load deployment info
  const deploymentPath = path.resolve(process.cwd(), "deployments.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployments.json not found. Please deploy contracts first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [deployer] = await ethers.getSigners();

  console.log("Creating demo tasks with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "CELO");

  // Connect to TaskManager
  const TaskManager = await ethers.getContractFactory("TaskManager");
  const taskManager = TaskManager.attach(deployment.contracts.TaskManager);

  console.log("\nCreating demo tasks...\n");

  const createdTasks = [];

  for (let i = 0; i < DEMO_TASKS.length; i++) {
    const task = DEMO_TASKS[i];
    const deadline = Math.floor(Date.now() / 1000) + task.deadlineHours * 3600;

    try {
      console.log(`Creating task ${i + 1}/${DEMO_TASKS.length}: ${task.description.substring(0, 50)}...`);
      
      const bountyAmount = ethers.parseEther(task.bountyAmount);
      
      const tx = await taskManager.createTask(
        task.description,
        task.category,
        bountyAmount,
        task.maxWorkers,
        {
          latitude: BigInt(Math.floor(task.location.latitude * 1e6)),
          longitude: BigInt(Math.floor(task.location.longitude * 1e6)),
          radius: BigInt(task.location.radius),
        },
        deadline,
        task.requirements,
        { value: bountyAmount }
      );

      const receipt = await tx.wait();
      
      // Extract task ID from event
      const taskCreatedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = taskManager.interface.parseLog(log);
          return parsed?.name === 'TaskCreated';
        } catch {
          return false;
        }
      });

      if (taskCreatedEvent) {
        const parsed = taskManager.interface.parseLog(taskCreatedEvent);
        const taskId = Number(parsed?.args[0]);
        createdTasks.push({ ...task, taskId, txHash: receipt?.hash });
        console.log(`  ✓ Task created! ID: ${taskId}, Bounty: ${task.bountyAmount} cUSD\n`);
      } else {
        console.log(`  ⚠ Task created but could not extract task ID\n`);
      }

      // Wait a bit between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error(`  ✗ Failed to create task: ${error.message}\n`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("DEMO TASKS CREATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Successfully created: ${createdTasks.length}/${DEMO_TASKS.length} tasks\n`);
  
  if (createdTasks.length > 0) {
    console.log("Created Task IDs:");
    createdTasks.forEach((task, idx) => {
      console.log(`  ${idx + 1}. Task ID: ${task.taskId} - ${task.description.substring(0, 40)}...`);
    });
  }
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



