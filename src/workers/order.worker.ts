import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { OrderRepository } from "../repositories/order.repository";
import { OrderService } from "../services/order.service";
import { DexRouterService } from "../services/dex-router.service";
import { sleep } from "../../src/utils/sleep";
import { DBClient } from "../repositories/db.interface"; 
import { Pool } from 'pg'; 

interface FastifyPgWrapper {
    pool: Pool; 
}

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null, 
});

const concurrency = Number(process.env.QUEUE_CONCURRENCY || 10);
const dexRouter = new DexRouterService();

export function startOrderWorker(pg: FastifyPgWrapper) { 
  
  const dbClient: DBClient = { query: pg.pool.query.bind(pg.pool) };
  
  const orderService = new OrderService(dbClient); 

  const worker = new Worker(
    "order-queue",
    async (job: Job) => {
      const { orderId } = job.data;
      
      const order = await OrderRepository.get(dbClient, orderId); 
      if (!order) throw new Error("Order not found in repository");

      try {
        await orderService.updateStatus(orderId, "routing");

        const best = await dexRouter.route(order as any);
        await orderService.updateStatus(orderId, "building", { chosenDex: best.dex as "Raydium" | "Meteora" });

        await orderService.updateStatus(orderId, "submitted");

        const execResult = await dexRouter.executeOnDex(best.dex as "Raydium" | "Meteora", order as any);

        await orderService.updateStatus(orderId, "confirmed", { txHash: execResult.txHash, executedPrice: execResult.executedPrice });
        return { txHash: execResult.txHash };
      } catch (err: any) {
        const reason = err?.message || "unknown";
        await orderService.updateStatus(orderId, "failed", { failureReason: reason });
        throw err;
      }
    },
    { connection, concurrency } 
  );
  
  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err?.message);
  });

  worker.on("completed", (job) => {
    console.log(`Job ${job?.id} completed`);
  });

  return worker;
}