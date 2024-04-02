// import net from "net";
// import { start, stop } from "./classBasedTrade.js";
// import { EventEmitter } from "events";

// const eventEmitter = new EventEmitter();

// //=====================Function server===================================
// // Create a TCP server using the 'net' module
// const server = net
//   // Define the server's behavior when a new socket connection is established
//   .createServer((socket) => {
//     // Event listener for 'data' events on the socket
//     socket.on("data", async (data) => {
//       // When data is received, emit a 'signal' event using Emitter
//       eventEmitter.emit("signal", data);
//       // eventEmitter.emit("signal", { data });
//     });

//     // Send a greeting message to the client
//     socket.write("SERVER: Hello! This is the server speaking.");

//     // End the socket connection with a closing message
//     socket.end("SERVER: Closing connection now.");
//   })

//   // Event listener for 'error' events on the server
//   .on("error", (err) => {
//     // Log any errors that occur
//     console.error(err);
//   });

// //============= Function startServer ==========
// // This function starts the server and performs additional actions
// export const startServer = async () => {
//   // Listen on port 6000 and the specified IP address
//   server.listen(6000, "0.0.0.0", () => {
//     // Log a message when the server has started, including the port it's listening on
//     console.log("Robot Server started on", server.address().port);
//   });
//   // Call the start function for the deriv websocket after the server has started
//   // start();
// };

// //============= Function stopServer ==========
// // This function stops the server and performs additional actions
// export const stopServer = () => {
//   // Close the server on its listening port
//   server.close(async function () {
//     // Additional actions, such as calling the stop function for the deriv websocket
//     stop();
//   });
// };

// export const startBot = (data) => {
//   start(data.id);
// };
// export const stopBot = (data) => {
//   stop(data.id);
// };

// export { eventEmitter };
