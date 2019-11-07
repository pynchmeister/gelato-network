// Javascript Ethereum API Library
const ethers = require("ethers");

// Helpers
const sleep = require("../../helpers/sleep.js").sleep;

// ENV VARIABLES
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const DEV_MNEMONIC = process.env.DEV_MNEMONIC;
const INFURA_ID = process.env.INFURA_ID;
console.log(
  `\n\t\t env variables configured: ${DEV_MNEMONIC !== undefined &&
    INFURA_ID !== undefined}`
);

// Setting up Provider and Signer (wallet)
const provider = new ethers.providers.InfuraProvider("rinkeby", INFURA_ID);
const wallet = ethers.Wallet.fromMnemonic(DEV_MNEMONIC);
const connectedWallet = wallet.connect(provider);

// Contract Addresses for instantiation
const GELATO_CORE_ADDRESS = "0x0e7dDacA829CD452FF341CF81aC6Ae4f0D2328A7";

// ReadInstance of GelatoCore
const gelatoCoreABI = [
  "function getMintingDepositPayable(address _action, address _selectedExecutor) view returns(uint)",
  "function mintExecutionClaim(address _trigger, bytes _triggerPayload, address _action, bytes _actionPayload, address _selectedExecutor) payable"
];
const gelatoCoreContract = new ethers.Contract(
  GELATO_CORE_ADDRESS,
  gelatoCoreABI,
  connectedWallet
);

// Trigger
const TRIGGER_DUTCHX_AUCTION_CLEARED =
  "0xBe45753474D625952a26303C48B19AA47809165a";
// Specific Trigger Params
const SELL_TOKEN = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c"; // rinkeby GNO
const BUY_TOKEN = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby WETH
const AUCTION_INDEX = "684";
// Action
const ACTION_WITHDRAW_FROM_DUTCHX_TO_USER =
  "0x41f1E7dC0087dDf692F1474275b460776c25946e";
// Specific Action Params:
const USER = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";
// const SELL_TOKEN = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c"; // rinkeby GNO
// const BUY_TOKEN = "0xc778417e063141139fce010982780140aa0cd5ab"; // rinkeby WETH
const SELL_AMOUNT_AFTER_FEE = ethers.utils.parseUnits("49.75", 18);

// gelatoCore.mintExecutionClaim params
const SELECTED_EXECUTOR_ADDRESS = "0x203AdbbA2402a36C202F207caA8ce81f1A4c7a72";

// ABI encoding function
const getTriggerDXAuctionClearedPayloadWithSelector = require("./dutchx-encoders/triggerDXAuctionClearedEncoder.js")
  .getTriggerDXAuctionClearedPayloadWithSelector;
const getActionWithdrawFromDXToUserPayloadWithSelector = require("./dutchx-encoders/actionWithdrawFromDXToUserEncoder.js")
  .getActionWithdrawFromDXToUserPayloadWithSelector;

// The execution logic
async function main() {
  // Encode the specific params for ActionKyberTrade
  const TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD = getTriggerDXAuctionClearedPayloadWithSelector(
    SELL_TOKEN,
    BUY_TOKEN,
    AUCTION_INDEX
  );
  console.log(
    `\t\t TriggerDutchXAuctionCleared Payload With Selector: \n ${TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD}\n`
  );

  // Encode the specific params for ActionKyberTrade
  const ACTION_WITHDRAW_FROM_DX_TO_USER_PAYLOAD = getActionWithdrawFromDXToUserPayloadWithSelector(
    USER,
    SELL_TOKEN,
    BUY_TOKEN,
    AUCTION_INDEX,
    SELL_AMOUNT_AFTER_FEE
  );
  console.log(
    `\t\t ActionWithdrawFromDutchXToUser Payload With Selector: \n ${ACTION_WITHDRAW_FROM_DX_TO_USER_PAYLOAD}\n`
  );

  // Getting the current Ethereum price
  let etherscanProvider = new ethers.providers.EtherscanProvider();
  let ethUSDPrice = await etherscanProvider.getEtherPrice();
  console.log(`\n\t\t Ether price in USD: ${ethUSDPrice}`);

  const MINTING_DEPOSIT = await gelatoCoreContract.getMintingDepositPayable(
    ACTION_WITHDRAW_FROM_DUTCHX_TO_USER,
    SELECTED_EXECUTOR_ADDRESS
  );
  console.log(
    `\n\t\t Minting Deposit: ${ethers.utils.formatUnits(
      MINTING_DEPOSIT,
      "ether"
    )} ETH \t\t${ethUSDPrice *
      parseFloat(ethers.utils.formatUnits(MINTING_DEPOSIT, "ether"))} $`
  );

  // send tx to PAYABLE contract method
  let tx;
  try {
    tx = await gelatoCoreContract.mintExecutionClaim(
      TRIGGER_DUTCHX_AUCTION_CLEARED,
      TRIGGER_DUTCHX_AUCTION_CLEARED_PAYLOAD,
      ACTION_WITHDRAW_FROM_DUTCHX_TO_USER,
      ACTION_WITHDRAW_FROM_DX_TO_USER_PAYLOAD,
      SELECTED_EXECUTOR_ADDRESS,
      {
        value: MINTING_DEPOSIT,
        gasLimit: 2000000
      }
    );
    console.log(
      `\n\t\t gelatoCore.mintExecutionClaim txHash:\n \t${tx.hash}\n`
    );
    // The operation is NOT complete yet; we must wait until it is mined
    console.log("\t\t waiting for the execute transaction to get mined \n");
    txreceipt = await tx.wait();
    console.log("\t\t Execute TX Receipt:\n", txreceipt);
    console.log(`\n\t\t minting tx mined in block ${txreceipt.blockNumber}`);
  } catch (err) {
    console.log(err);
  }
}

// What to execute when running node
main().catch(err => console.log(err));
