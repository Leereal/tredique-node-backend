import WebSocket from "ws";
import { Socket } from "./index.js";
import config from "./config.js";
import {
  getAllConnections,
  updateConnection,
} from "./actions/connection.actions.js";
import { updateAccount } from "./actions/account.actions.js";
import { symbols } from "./utils/symbols.js";
import { eventEmitter } from "./server.js";

var robotConnections;

export const signal = async () => {
  ws.onmessage({ data: data });
};

export const start = async () => {
  //Get all robot connections that are activated for trading
  robotConnections = await getAllConnections();
  var open_trade = false;
  var expiration_time;

  //We create websocket instance here
  const ws = new WebSocket(config.ws_url);

  //Open websocket
  ws.onopen = function (evt) {
    robotConnections.forEach((robotConnection) => {
      ws.send(JSON.stringify({ authorize: robotConnection.account.token })); // First send an authorize call.
      setInterval(ping, 30000); //Ping every 30 secs to stay connected
    });
  };

  //Receive signal from server emitter
  eventEmitter.on("signal", (data) => {
    ws.onmessage({ data: data });
  });

  ws.onmessage = async function (msg) {
    const data = JSON.parse(msg.data);

    switch (data.msg_type) {
      case "authorize":
        //Subscribe and request balance
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        break;

      case "balance":
        const balance = data.balance;
        await updateAccount(balance);
        console.log("Balance : ", balance.balance);
        Socket.emit("bot", {
          action: "balance",
          data: balance,
        });
        //TODO : check if this is supposed to be commented
        // dynamicStake(balance, robotConnections);
        targetCheck(balance);
        break;
      case "proposal":
        //Place the trade here after receiving proposal response
        ws.send(
          JSON.stringify({
            buy: data.proposal.id,
            price: 30000,
            subscribe: 1,
          })
        );
        open_trade = true;
        expiration_time = Date.now() + expiration * 60;
        break;
      case "buy":
        try {
          //Update the database connection document
          await updateConnection(robotConnection, {
            //which connection to update????
            active_contract_id: data.buy.contract_id,
            open_trade: true,
            entry: data.buy.longcode,
          });
          //Get the updated documents
          Socket.emit("bot", {
            action: "open_trade",
            data: data.buy,
          });
        } catch (error) {
          console.log("targetCheck error: ", error);
        } finally {
          console.log(
            "Signal Placed Successfully:" + new Date().toLocaleString()
          );
        }
        break;

      case "proposal_open_contract":
        console.log("proposal_open_contract : ", data);
        // Because we subscribed to the buy request we will receive updates on our open contract.
        const isSold = data.proposal_open_contract.is_sold;
        if (isSold) {
          // If `isSold` is true it means our contract has finished and we can see if we won or not.
          open_trade = false;
          if (data.proposal_open_contract.profit < 0) {
            current_level = current_level + 1;
            await updateConnection(id, "current_level", current_level);
          } else {
            current_level = 1;
            await updateRobotSettings(id, "current_level", current_level);
            // ws.send(JSON.stringify({ "balance": 1, "subscribe": 1 }))
          }
          await updateRobotSettings(id, "active_contract_id", "");
          await updateRobotSettings(
            id,
            "last_profit",
            data.proposal_open_contract.profit
          );
          await updateRobotSettings(id, "open_trade", false);
          await updateRobotSettings(id, "entry", "");
          Socket.emit("closed_trade", { message: "Trade Closed" });
          postMessage(
            `
            *PROFIT: ${
              data.proposal_open_contract.profit > 0
                ? "🤑" +
                  account_settings.currency +
                  data.proposal_open_contract.profit +
                  "🤑"
                : "👎" +
                  account_settings.currency +
                  data.proposal_open_contract.profit +
                  "👎"
            }*
            _Quickbucks Robot_
            `
          );
        } else {
          // We can track the status of our contract as updates to the spot price occur.
          // console.log(data);
          var currentSpot = data.proposal_open_contract.current_spot;
          var entrySpot = 0;
          var currentProfit = data.proposal_open_contract.profit_percentage;
          var entryTickTime = data.proposal_open_contract.entry_tick_time;

          if (typeof data.proposal_open_contract.entry_tick != "undefined") {
            entrySpot = data.proposal_open_contract.entry_tick;
          }
          open_trade = true;
          // console.log("Entry spot " + entrySpot + "\n");
          // console.log("Current spot " + currentSpot + "\n");
          // console.log("Difference " + (currentSpot - entrySpot) + "\n");
          console.log(
            "Current Profit: " +
              currentProfit +
              "% | Current Level: " +
              current_level +
              " Martingale :" +
              account.martingale
          );
          Socket.emit("current_profit", {
            message: "Current Profit",
            current_profit: currentProfit,
          });
          if (close_on_profit(currentProfit, entryTickTime)) {
            //Close trade here
          }
        }
        break;
      case "signal":
        const symbol = data.symbol;
        const val = symbols.find((symb) => symb.name === symbol);
        const symbol_code = val ? val.code : symbol;
        if (!open_trade) {
          placeOrder(symbol_code, data.trade_option);
        } else {
          const { active_contract_id } = await getConnectionById(
            this.robotConnection._id
          ); //Get the running order id from database
          if (active_contract_id > 0) {
            ws.send(
              JSON.stringify({
                proposal_open_contract: 1,
                contract_id: active_contract_id,
                subscribe: 1,
              })
            );
            console.log("Sending Proposal Request");
          }
        }
        break;
      case "ping":
        console.log("Connection still alive");
        if (Date.now() > expiration_time) {
          open_trade = false;
        }
        break;
      default:
        console.log("Default Data :", data);
    }
  };
  const ping = () => {
    ws.send(JSON.stringify({ ping: 1 }));
  };
  const placeOrder = (symbol_code, trade_option) => {
    robotConnections.forEach((robotConnection) => {
      let local_stake = robotConnection.stake;
      if (robotConnection.martingale === 1) {
        local_stake = martingale(robotConnection);
      }
      expiration_time = Date.now() + robotConnection.expiration * 60;
      ws.send(
        JSON.stringify({
          proposal: 1,
          amount: local_stake,
          basis: "stake",
          contract_type: trade_option === "buy" ? "CALL" : "PUT",
          currency: account.currency,
          duration: expiration,
          duration_unit: "m",
          symbol: symbol_code,
        })
      );
      console.log("Place Order here");
    });
    open_trade = true;
  };

  console.log("Starting bot");
};

export const stop = async () => {
  //ws.close();
  console.log("Robot Server Stopped");
  //await stopBotServer(1);
  Socket.emit("bot_status", { active: false });
};

const dynamicStake = (balance, robotConnections) => {
  const robotConnection = robotConnections.find(
    (con) => con.account.account_name === balance.loginid
  );
  if (robotConnection.current_level === 1) {
    if (robotConnection.currency === "BTC") {
      stake = (process.env.APP_MULTIPLIER * balance).toFixed(8);
    } else {
      stake =
        Math.round(process.env.APP_MULTIPLIER * balance.balance * 100) / 100;
    }
    // updateRobotSettings(id, "stake", stake);
  }
};

const targetCheck = async (data) => {
  const robotConnection = robotConnections.find(
    (con) => con.account.account_name === data.loginid
  );
  if (data.balance > robotConnection.target_percentage) {
    console.log(`ACCOUNT ${data.loginid} : DAILY TARGET REACHED`);
    try {
      //Update the database connection document
      await updateConnection(robotConnection, {
        target_reached: true,
        active: false,
      });
      //Get the updated documents
      robotConnections = await getAllConnections();
    } catch (error) {
      console.log("targetCheck error: ", error);
    } finally {
      Socket.emit("bot", {
        action: "target_reached",
        data: robotConnection,
      });
      return true;
    }
  } else {
    return false;
  }
};

const martingale = (robotConnection) => {
  let totalLastStakes = 0;
  let new_stake = 0;
  for (i = 1; i <= robotConnection.current_level; i++) {
    new_stake =
      (robotConnection.stake * i * robotConnection.payout + totalLastStakes) /
      robotConnection.payout;
    totalLastStakes =
      totalLastStakes +
      (robotConnection.stake * i * robotConnection.payout + totalLastStakes) /
        robotConnection.payout;
  }
  console.log("Martingale Stake: " + Math.round(new_stake * 100) / 100);
  if (robotConnection.currency === "BTC") {
    return new_stake.toFixed(8);
  }
  return Math.round(new_stake * 100) / 100;
};
