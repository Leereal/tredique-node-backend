import WebSocket from "ws";
import { Socket } from "./index.js";
import config from "./config.js";
import {
  getAllConnections,
  getConnectionById,
  updateConnection,
} from "./actions/connection.actions.js";
import { updateAccount } from "./actions/account.actions.js";
import { symbols } from "./utils/symbols.js";
import { eventEmitter } from "./server.js";
import mongoose from "mongoose";
import { updateRobot } from "./actions/robot.actions.js";
import { createPendingOrder } from "./actions/pending_order.actions.js";
import {
  createSignal,
  findSignalCategoryByName,
} from "./actions/signal.action.js";
let accountWebSockets = [];
let pending_orders = [];
class AccountWebSocket {
  constructor(robotConnection, eventEmitter) {
    this.robotConnection = robotConnection;
    this.robotConnection_id = robotConnection._id;
    this.token = robotConnection.account.token;
    this.eventEmitter = eventEmitter;

    this.openTrade = false;
    this.expirationTime = null;

    this.ws = new WebSocket(config.ws_url);
    this.setupEventHandlers();
    this.subscribeToEvents();
  }

  setupEventHandlers() {
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
  }

  subscribeToEvents() {
    this.eventEmitter.on("signal", (data) => {
      this.ws.onmessage({ data });
    });
  }

  onOpen(event) {
    console.log(`WebSocket connection opened for account ${this.token}`);
    this.authorizeAccount();
    setInterval(() => this.ping(), 30000); // Ping every 30 secs to stay connected
  }

  onMessage(msg) {
    const data = JSON.parse(msg.data);
    // Handle messages based on the message type
    switch (data.msg_type) {
      case "authorize":
        this.subscribeAndRequestBalance();
        break;

      case "balance":
        this.handleBalanceUpdate(data.balance);
        if (this.robotConnection.dynamic_stake) {
          this.dynamicStake(data.balance.balance);
        }
        this.targetCheck(data.balance);
        break;

      case "signal":
        this.handleSignal(data);
        break;
      case "pending_order":
        this.handlePendingOrder(data);
        break;

      case "proposal":
        this.handleProposal(data);
        break;

      case "buy":
        this.handleBuy(data.buy);
        break;

      case "proposal_open_contract":
        this.handleProposalOpenContract(data.proposal_open_contract);
        break;
      case "tick":
        this.watchPrice(data.tick);
        break;
      case "ping":
        this.handlePing();
        break;

      default:
        console.log("Unhandled message type:", data.msg_type);
        console.log("Data:", data);
    }
  }

  onClose(event) {
    console.log(`WebSocket connection closed for account ${this.token}`);
    // Handle onClose event if needed
  }

  onError(event) {
    console.error(
      `WebSocket error for account ${this.token}: ${event.message}`
    );
    // Handle onError event if needed
  }

  authorizeAccount() {
    this.ws.send(JSON.stringify({ authorize: this.token }));
  }

  async subscribeAndRequestBalance() {
    this.ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
    //Update Robot model
    await updateRobot(this.robotConnection.robot, {
      active: true,
    });

    Socket.emit("bot", {
      action: "bot_started",
      data: { ...this.robotConnection },
    });
  }

  handleBalanceUpdate(balance) {
    updateAccount(balance);
    console.log(`Balance for account ${this.token}: ${balance.balance}`);
    Socket.emit("bot", {
      action: "balance",
      data: this.robotConnection,
    });
    // Call other functions or update class properties based on balance update
  }

  ping() {
    this.ws.send(JSON.stringify({ ping: 1 }));
  }

  handlePing() {
    console.log("Connection still alive");
    if (this.expirationTime && Date.now() > this.expirationTime) {
      this.openTrade = false;
      this.expirationTime = null;
      console.log("Trade expired : ", this.expirationTime);
    }
  }

  handleSignal(data) {
    const symbol = data.symbol;
    const val = symbols.find((symb) => symb.name === symbol);
    const symbol_code = val ? val.code : symbol;
    if (!this.openTrade) {
      ("Open Trade Call here");
      this.placeOrder(symbol_code, data.trade_option);
    } else {
      this.handleOpenTrade(data);
    }
    broadcastSignal(signal);
  }

  async broadcastSignal(signal) {
    const signalCategory = await findSignalCategoryByName("deriv-binary");
    if (!signalCategory) {
      console.log("No signal category found");
      return;
    }

    const newSignal = {
      signalCategoryId: signalCategory._id,
      symbol: signal.symbol,
      entryRange: signal.price,
      isPremium: false,
      isActive: true,
      profit: null,
      type: signal.type,
      expiration: signal.expiration || 5,
      isBinary: true,
    };

    const savedSignal = await createSignal(newSignal);
    Socket.emit("broadcastSignal", savedSignal);
  }

  async handlePendingOrder(data) {
    pending_orders.push(data);
    let symbol_code = symbols.find((pair) => pair.name === data.symbol).code;

    //Subscribe to get every current quote price
    this.ws.send(JSON.stringify({ ticks: symbol_code, subscribe: 1 }));

    //Add to database
    delete data.msg_type;
    let dbData = {
      ...data,
      connection: this.robotConnection_id,
      connector: this.robotConnection.connector._id,
      createdAt: new Date(),
      active: true,
    };
    await createPendingOrder(dbData);

    //Notify client
    Socket.emit("pending_order_success", {
      _id: data.symbol,
    });
  }

  async watchPrice(data) {
    console.log("watchPrice Data : ", data);
    if (data) {
      const asset = await symbols.find((pair) => pair.code === data.symbol)
        ?.name;
      const pending_order = await pending_orders.find(
        (order) => order.symbol === asset
      );

      if (
        pending_order &&
        pending_order.prev_price !== undefined &&
        data.quote !== pending_order.prev_price
      ) {
        console.log("pending_order Data : ", pending_order);
        console.log(
          `Current Price : ${data.quote} => Pending Order : ${pending_order?.price} => Prev Price : ${pending_order?.prev_price}`
        );
        let entry;
        switch (pending_order.action) {
          case "buy_stop":
            if (
              pending_order.prev_price <= data.quote &&
              data.quote >= pending_order.price
            ) {
              entry = {
                symbol: asset,
                trade_option: "buy",
                msg_type: "signal",
              };
              //Enter trade
              this.onMessage({ data: JSON.stringify(entry) });
              //Unsubscribe to the ticks
              this.ws.send(
                JSON.stringify({ ticks: data.symbol, subscribe: 0 })
              );
              //Remove it from pending orders lis
              pending_orders = pending_orders.filter(
                (order) => order.symbol !== asset
              );
              //
            } else {
              //Updating previous price for the current pending order
              pending_orders = pending_orders.map((item) => {
                if (item.symbol === asset) {
                  return { ...item, prev_price: data.quote };
                }
              });
            }
            break;

          case "buy_limit":
            if (
              pending_order.prev_price >= data.quote &&
              data.quote <= pending_order.price
            ) {
              entry = {
                symbol: asset,
                trade_option: "buy",
                msg_type: "signal",
              };
              //Enter trade
              this.onMessage({ data: JSON.stringify(entry) });
              //Unsubscribe to the ticks
              this.ws.send(
                JSON.stringify({ ticks: data.symbol, subscribe: 0 })
              );
              //Remove it from pending orders lis
              pending_orders = pending_orders.filter(
                (order) => order.symbol !== asset
              );
            } else {
              //Updating previous price for the current pending order
              pending_orders = pending_orders.map((item) => {
                if (item.symbol === asset) {
                  return { ...item, prev_price: data.quote };
                }
              });
            }
            break;
          case "sell_stop":
            if (
              pending_order.prev_price >= data.quote &&
              data.quote <= pending_order.price
            ) {
              entry = {
                symbol: asset,
                trade_option: "sell",
                msg_type: "signal",
              };
              //Enter trade
              this.onMessage({ data: JSON.stringify(entry) });
              //Unsubscribe to the ticks
              this.ws.send(
                JSON.stringify({ ticks: data.symbol, subscribe: 0 })
              );
              //Remove it from pending orders lis
              pending_orders = pending_orders.filter(
                (order) => order.symbol !== asset
              );
            } else {
              //Updating previous price for the current pending order
              pending_orders = pending_orders.map((item) => {
                if (item.symbol === asset) {
                  return { ...item, prev_price: data.quote };
                }
              });
            }
            break;
          case "sell_limit":
            if (
              pending_order.prev_price <= data.quote &&
              data.quote >= pending_order.price
            ) {
              entry = {
                symbol: asset,
                trade_option: "sell",
                msg_type: "signal",
              };
              //Enter trade
              this.onMessage({ data: JSON.stringify(entry) });
              //Unsubscribe to the ticks
              this.ws.send(
                JSON.stringify({ ticks: data.symbol, subscribe: 0 })
              );
              //Remove it from pending orders lis
              pending_orders = pending_orders.filter(
                (order) => order.symbol !== asset
              );
            } else {
              //Updating previous price for the current pending order
              pending_orders = pending_orders.map((item) => {
                if (item.symbol === asset) {
                  return { ...item, prev_price: data.quote };
                }
              });
            }
            break;
          default:
            break;
        }
      } else {
        pending_orders = pending_orders.map((item) => {
          if (item.symbol === asset) {
            return { ...item, prev_price: data.quote };
          }
        });
      }
    }
  }

  async placeOrder(symbol_code, trade_option) {
    const robotConnection = this.robotConnection;
    if (!robotConnection) {
      console.error("No robotConnection found.");
      return;
    }

    let local_stake = robotConnection.stake;
    if (robotConnection.martingale) {
      local_stake = await this.martingale();
    }

    console.log("Local Stake : ", local_stake);

    this.expirationTime = Date.now() + robotConnection.expiration * 60;
    this.ws.send(
      JSON.stringify({
        proposal: 1,
        amount: local_stake,
        basis: "stake",
        contract_type: trade_option === "buy" ? "CALL" : "PUT",
        currency: robotConnection.currency,
        duration: robotConnection.expiration,
        duration_unit: "m",
        symbol: symbol_code,
      })
    );
  }

  handleProposal(data) {
    if (!data.proposal) {
      console.error("No proposal found.: ", data);
      return;
    }
    const proposalId = data.proposal.id;
    if (proposalId && !this.openTrade) {
      try {
        this.ws.send(
          JSON.stringify({
            buy: proposalId,
            price: 30000,
            subscribe: 1,
          })
        );

        this.openTrade = true;
        this.expirationTime = Date.now() + this.robotConnection.expiration * 60;
      } catch (error) {
        console.log("handleProposal error: ", error);
      }
    }
  }

  async handleBuy(buyData) {
    if (!buyData) {
      console.error("No buyData found.");
      return;
    }

    try {
      // Update the database connection document
      await updateConnection(this.robotConnection, {
        active_contract_id: buyData.contract_id,
        open_trade: true,
        entry: buyData.longcode,
      });

      // Get the updated documents
      Socket.emit("bot", {
        action: "trade_success",
        data: this.robotConnection,
      });
    } catch (error) {
      console.log("handleBuy error: ", error);
    } finally {
      console.log("Signal Placed Successfully:" + new Date().toLocaleString());
    }
  }

  async handleProposalOpenContract(proposalOpenContractData) {
    if (!proposalOpenContractData) {
      console.error("No proposalOpenContractData found.");
      return;
    }

    const isSold = proposalOpenContractData.is_sold;
    if (isSold) {
      this.handleSoldContract(proposalOpenContractData);
    } else {
      this.handleOpenContract(proposalOpenContractData);
    }
  }

  async handleSoldContract(proposalOpenContractData) {
    // If `isSold` is true it means our contract has finished, and we can see if we won or not.
    this.openTrade = false;
    if (proposalOpenContractData.profit < 0) {
      const robotConnection = await getConnectionById(this.robotConnection._id);
      await updateConnection(this.robotConnection, {
        current_level: robotConnection.current_level + 1,
      });
      Socket.emit("bot", {
        action: "closed_trade",
        data: { ...this.robotConnection.toObject(), profit: false },
      });
    } else {
      await updateConnection(this.robotConnection, {
        current_level: 1,
      });
      Socket.emit("bot", {
        action: "closed_trade",
        data: { ...this.robotConnection.toObject(), profit: true },
      });
    }
    //Update connection
    await updateConnection(this.robotConnection, {
      last_profit: proposalOpenContractData.profit,
      open_trade: false,
      entry: "",
      active_contract_id: "",
    });
  }

  async handleOpenContract(proposalOpenContractData) {
    // We can track the status of our contract as updates to the spot price occur.
    const currentProfit = proposalOpenContractData.profit_percentage;
    const entryTickTime = proposalOpenContractData.entry_tick_time;

    const entrySpot = proposalOpenContractData.entry_tick || 0;
    this.openTrade = true; // Making sure that the open trade is updated

    console.log(
      `Current Profit: ${currentProfit}% | Current Level: ${this.robotConnection.current_level} Martingale: ${this.robotConnection.martingale}`
    );

    Socket.emit("bot", {
      action: "current_profit",
      data: {
        _id: this.robotConnection_id,
        current_profit: currentProfit,
      },
    });
  }

  async handleOpenTrade() {
    const { active_contract_id } = await getConnectionById(
      this.robotConnection._id
    ); // Get the running order id from the database
    if (active_contract_id > 0) {
      this.ws.send(
        JSON.stringify({
          proposal_open_contract: 1,
          contract_id: active_contract_id,
          subscribe: 1,
        })
      );
      console.log("Sending Proposal Request for Non Active Open Signal");
    }
  }

  async martingale() {
    const robotConnection = await getConnectionById(this.robotConnection._id);
    this.robotConnection = robotConnection; // We are just updating the instance robotConnection
    let totalLastStakes = 0;
    let new_stake = 0;

    for (let i = 1; i <= robotConnection.current_level; i++) {
      new_stake =
        (robotConnection.stake * i * robotConnection.payout + totalLastStakes) /
        robotConnection.payout;
      totalLastStakes +=
        (robotConnection.stake * i * robotConnection.payout + totalLastStakes) /
        robotConnection.payout;
    }

    const roundedStake =
      robotConnection.currency === "BTC"
        ? new_stake.toFixed(8)
        : Math.round(new_stake * 100) / 100;

    console.log(`Martingale Stake: ${roundedStake}`);
    return roundedStake;
  }

  async dynamicStake(balance) {
    if (this.robotConnection.current_level === 1) {
      let stake;

      if (this.robotConnection.currency === "BTC") {
        stake = (config.app_multiplier * balance).toFixed(8);
      } else {
        stake = Math.round(config.app_multiplier * balance * 100) / 100;
      }
      if (stake) {
        await updateConnection(this.robotConnection, { stake });
      }
    }
  }

  async targetCheck(data) {
    if (data.balance > this.robotConnection.target_percentage) {
      console.log(`ACCOUNT ${data.loginid} : DAILY TARGET REACHED`);

      try {
        // Update the database connection document
        await updateConnection(this.robotConnection, {
          target_reached: true,
          active: false,
        });
        this.close();
      } catch (error) {
        console.log("targetCheck error: ", error);
      } finally {
        Socket.emit("bot", {
          action: "target_reached",
          data: this.robotConnection,
        });

        return true;
      }
    } else {
      return false;
    }
  }
  // Add other methods as needed
  close() {
    this.ws.close();
  }
}

export const start = async (id) => {
  const robotId = new mongoose.Types.ObjectId(id);
  const robotConnections = await getAllConnections(robotId);

  accountWebSockets = robotConnections.map((robotConnection) => {
    return new AccountWebSocket(robotConnection, eventEmitter);
  });

  console.log("Starting bot");

  // Return the created instances for later reference
  return accountWebSockets;
};

export const stop = async (id) => {
  // Close WebSocket connections for all accounts
  // Iterate over accountWebSocket instances and call close()
  const robotId = new mongoose.Types.ObjectId(id);

  // Update robot status in the database
  await updateRobot(robotId, {
    active: false,
  });

  // Close WebSocket connections for the globally stored accountWebSockets instances
  accountWebSockets.forEach((accountWebSocket) => {
    accountWebSocket.close();
  });
  console.log("Robot Server Stopped");
  Socket.emit("bot", { action: "bot_started", data: { id: id } });
};

export const signal = (data) => {
  let entry;
  if (data.price) {
    entry = {
      symbol: data.symbol,
      action: data.action,
      msg_type: "pending_order",
      price: data.price,
      option: "rise and fall",
    };
  } else {
    entry = {
      symbol: data.symbol,
      trade_option: data.action === "call" ? "buy" : "sell",
      msg_type: "signal",
    };
  }

  accountWebSockets.forEach((accountWebSocket) => {
    accountWebSocket.onMessage({ data: JSON.stringify(entry) });
  });
};

// Add other utility functions or constants as needed
