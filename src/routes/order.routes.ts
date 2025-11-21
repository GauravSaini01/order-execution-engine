import { FastifyPluginAsync } from "fastify";
import { createOrderHandler, listOrdersHandler } from "../controllers/order.controller"; 
import { registerWsClient } from "../services/websocket.service";

const orderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.log.info("--- ATTEMPTING TO REGISTER ORDER ROUTES ---");
  fastify.post("/orders/execute", async (request, reply) => {
    return createOrderHandler(request, reply);
  });

  fastify.get("/orders", async (request, reply) => {
    return listOrdersHandler(request, reply);
  });
  
  fastify.get(
    "/orders/ws",
    { websocket: true },
    (ws, req) => {
      const query = req.query as { orderId?: string };

      if (!query.orderId) {
        ws.send(JSON.stringify({ error: "orderId missing" }));
        ws.close();
        return;
      }

      const orderId = query.orderId;

      registerWsClient(orderId, ws);

      ws.send(JSON.stringify({ event: "connected", orderId }));
    }
  );
};

export default orderRoutes;