// config.js
const config = {
  app_id: process.env.APP_ID || 1089,
  socket_port: process.env.APP_SOCKET_PORT || 8080,
  close_in_profit_time: process.env.CLOSE_IN_PROFIT_TIME || 600000, // Default to 10 minutes
  app_multiplier: process.env.APP_MULTIPLIER || 0.0158, // Default multiplier //0.00158 for BTC and 0.0158 for USD
  ws_url:
    process.env.WS_URL || "wss://ws.derivws.com/websockets/v3?app_id=1089",
  ping_interval: process.env.PING_INTERVAL || 30000, // Default to 30 seconds
  // Add more configurations as needed
};
export default config;
