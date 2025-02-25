import { createClient } from "redis";

const redisClient = createClient({ socket: { host: "localhost", port: 6379 } });

redisClient.on("error", (err) => console.error("Redis Error:", err));

(async () => {
  try {
    await redisClient.connect();
    console.log("✅ Connected to Redis");
  } catch (err) {
    console.error("❌ Redis Connection Failed:", err);
  }
})();

export default redisClient;
