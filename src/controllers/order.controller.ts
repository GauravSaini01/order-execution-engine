import { FastifyReply, FastifyRequest } from "fastify";
import { OrderService } from "../services/order.service";
import { DBClient } from "../repositories/db.interface";

async function getDBClient(request: FastifyRequest): Promise<DBClient> {
    return { query: request.server.pg.pool.query.bind(request.server.pg.pool) };
}


export async function createOrderHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as any; 
    
    if (!body) {
      return reply.status(400).send({ error: "Missing body" });
    }

    const { type, tokenIn, tokenOut, amount } = body;

    if (!type || !tokenIn || !tokenOut || !amount) {
      return reply.status(400).send({ error: "Missing fields: type, tokenIn, tokenOut, amount" });
    }

    if (type !== "market") {
      return reply.status(400).send({ error: "Only 'market' order supported in mock" });
    }
    
    const client = await getDBClient(request);
    const svc = new OrderService(client); 

    const orderId = await svc.createOrder({ type, tokenIn, tokenOut, amount });
    await svc.enqueueOrder(orderId);

    return reply.send({ orderId, ws: `/api/orders/ws?orderId=${orderId}` });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({ error: err.message || "internal" });
  }
}

export async function listOrdersHandler(request: FastifyRequest, reply: FastifyReply) {
    try {
        const client = await getDBClient(request);
        const svc = new OrderService(client);
        
        const orders = await svc.listOrders();
        
        return reply.send(orders);
    } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ error: err.message || "internal" });
    }
}