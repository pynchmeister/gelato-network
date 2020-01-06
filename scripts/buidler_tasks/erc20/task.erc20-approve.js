import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../buidler.config";

export default task(
  "erc20-approve",
  `Send tx to <erc20address> to approve <spender> for <amount> and return (or --log) tx hash on [--network] (default: ${defaultNetwork})`
)
  .addPositionalParam(
    "erc20address",
    "Must be in config.networks.[--network].addressbook.erc20"
  )
  .addPositionalParam("spender", "Address of approvee")
  .addPositionalParam("amount", "Uint: amount to approve spender for")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async ({ erc20address, amount, log, spender }) => {
    await run("checkAddressBook", {
      networkname: network.name,
      category: "erc20",
      entry: erc20address
    });

    const erc20Symbol = await run("bre-config", {
      addressbookcategory: "erc20",
      addressbookentry: erc20address
    });

    const txHash = await run("erc20:approve", {
      erc20address,
      spender,
      amount,
      log
    });

    if (log)
      console.log(
        `\nApproved spender: ${spender} for ${amount /
          10 ** 18} ${erc20Symbol}\n`
      );

    return txHash;
  });