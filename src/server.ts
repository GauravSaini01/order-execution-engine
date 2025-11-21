import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fastifyCors from "@fastify/cors";
import orderRoutes from "./routes/order.routes";
import dbPlugin from "./db/db.plugin"; 

export async function createServer() {
  const server = Fastify({ logger: true });

  await server.register(dbPlugin); 
  
  await server.register(fastifyCors, {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
  });

  await server.register(websocket);

  server.register(orderRoutes, { prefix: "/api" });

  server.get("/health", async (request, reply) => {
    return { status: "ok", timestamp: Date.now() };
  });

  return server;
}