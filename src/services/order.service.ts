import { v4 as uuidv4 } from "uuid";
import { Order } from "../models/order.model";
import { OrderRepository } from "../repositories/order.repository";
import { orderQueue } from "../queues/order.queue";
import { sendEvent } from "../services/websocket.service"; 
import { DBClient } from "../repositories/db.interface"; 

export class OrderService {
  private dbClient: DBClient | null; 

  constructor(client: DBClient | null = null) {
      this.dbClient = client;
  }
  
  private getClient(client?: DBClient): DBClient {
      const c = client || this.dbClient;
      if (!c) {
          throw new Error("Database client not provided to OrderService operation.");
      }
      return c;
  }

  async createOrder(payload: { type: any; tokenIn: string; tokenOut: string; amount: number }) {
    const client = this.getClient(); 
    const id = uuidv4();
    const order: Order = {
      id,
      type: payload.type,
      tokenIn: payload.tokenIn,
      tokenOut: payload.tokenOut,
      amount: payload.amount,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    await OrderRepository.create(client, order); 
    sendEvent(id, "pending", { order });
    return id;
  }

  async enqueueOrder(orderId: string) {
    await orderQueue.add("execute-order", { orderId }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 500 }
    });
  }

  async updateStatus(orderId: string, status: Order["status"], payload?: Partial<Order>, client?: DBClient) {
    const c = this.getClient(client);
    await OrderRepository.update(c, orderId, { status, ...payload }); 
    sendEvent(orderId, status, payload ?? {});
  }

  async getOrder(orderId: string, client?: DBClient) {
    const c = this.getClient(client);
    return OrderRepository.get(c, orderId); 
  }
  
  async listOrders(client?: DBClient) { 
    const c = this.getClient(client);
    return OrderRepository.list(c);
  }
}