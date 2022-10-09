const { network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

  if (chainId == 31337) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    //create a subscription ID programmatically
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    //fund the subscription without the link token (mock only)
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const entranceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    gasLane,
    interval,
    entranceFee,
    callbackGasLimit,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...");
    await verify(raffle.address, arguments);
  }
  log("Enter lottery with command:");
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  log(`yarn hardhat run scripts/enterRaffle.js --network ${networkName}`);
  log("----------------------------------------------------");
};
module.exports.tags = ["all", "raffle"];
