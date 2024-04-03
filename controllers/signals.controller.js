import {
  createSignal,
  findSignalCategoryByName,
} from "../actions/signal.action.js";
import { Socket } from "../index.js";
import { handleError } from "../utils/index.js";
import { EventEmitter } from "events";
import { receiveSignalFromMT5 } from "../classBasedTrade.js";

const eventEmitter = new EventEmitter();

export async function createSignalController(req, res) {
  try {
    const signalCategory = await findSignalCategoryByName("deriv-binary");

    if (!signalCategory) {
      console.log("No signal category found");
      res.status(404).send("No signal category found");
      return;
    }

    const signal = req.body;

    if (signal.symbol.toLowerCase().includes("volatility")) {
      signal.symbol = signal.symbol
        .replace(/\bindex(?:es?)?\b/gi, "")
        .toUpperCase()
        .trim(); // Remove index
    }

    //Enter first before saving
    console.log("Signal Placed Successfully:" + new Date().toLocaleString());

    const newSignal = {
      signalCategory: signalCategory._id,
      symbol: signal.symbol,
      entryRange: signal.price,
      isPremium: signal.isPremium,
      isActive: true,
      profit: null,
      type: signal.type,
      expiration: +signal.expiration || 5,
      isBinary: true,
      createdAt: new Date(),
    };

    const savedSignal = await createSignal(newSignal);
    signal.savedSignal = savedSignal;
    receiveSignalFromMT5(signal);
    Socket.emit("broadcastedSignal", savedSignal);

    res.status(200).send(savedSignal);
  } catch (error) {
    handleError(error);
    res.status(500).send(error);
  }
}
