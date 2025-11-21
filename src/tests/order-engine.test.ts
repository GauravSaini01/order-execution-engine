import 'dotenv/config'; 

import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from "vitest";
import WebSocket from "ws";
import IORedis from "ioredis";
import { Queue, Worker, Job, QueueEvents } from "bullmq"; 
import { createServer } from "../server";
import { MockDexClient } from "../services/dex/mock-dex";
import { OrderService } from "../services/order.service";
import { OrderRepository } from "../repositories/order.repository";
import { Order } from "../models/order.model";
import { DBClient } from "../repositories/db.interface";
import { DexRouterService } from '../services/dex-router.service'; 


const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || 6379}`;
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const TEST_PORT = 4001;
const TEST_QUEUE_NAME = "test-order-queue";

vi.mock("../utils/sleep", () => ({
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, Math.min(ms, 10)))
}));

const mockOrder: Order = { 
    id: "test-id-999", type: "market", tokenIn: "SOL", tokenOut: "USDC", 
    amount: 10, status: "pending", createdAt: new Date().toISOString() 
};
type TestJobData = { orderId: string };
type TestJobResult = { status: string };

const updateStatusSpy = vi.spyOn(
    OrderService.prototype, 
    'updateStatus' as keyof OrderService 
); 


describe("Order Execution Engine Integration Tests (Cleaned)", () => {
  let server: any;
  let queue: Queue<TestJobData, TestJobResult, string>; 
  let queueEvents: QueueEvents; 

  beforeAll(async () => {
    server = await createServer();
    await server.listen({ port: TEST_PORT }); 
    
    queue = new Queue<TestJobData, TestJobResult, string>(TEST_QUEUE_NAME, { connection }); 
    queueEvents = new QueueEvents(TEST_QUEUE_NAME, { connection }); 
    
    await queue.drain(true);
  });

  afterAll(async () => {
    await server?.close(); 
    await queueEvents?.close(); 
    await queue.close();
    await connection.quit();
    updateStatusSpy.mockRestore(); 
  });

  afterEach(async () => {
      updateStatusSpy.mockClear(); 
      vi.restoreAllMocks(); 
      vi.spyOn(OrderService.prototype, 'updateStatus' as keyof OrderService);
  });
  
  describe("1. DEX Routing Logic", () => {
    it("1. Quotes return numeric prices and amountOut values", async () => {
      const router = new MockDexClient();
      const r = await router.getRaydiumQuote("SOL", "USDC", 1);
      
      expect(typeof r.price).toBe("number");
      expect(typeof r.amountOut).toBe("number");
      expect(r.dex).toBe("Raydium");
    });

    it("2. The DexRouterService chooses the better quote based on amountOut", async () => {
      const raydiumSpy = vi.spyOn(MockDexClient.prototype, 'getRaydiumQuote').mockResolvedValue({
        dex: "Raydium", price: 100, fee: 0.003, amountOut: 1000.5 
      });
      const meteoraSpy = vi.spyOn(MockDexClient.prototype, 'getMeteoraQuote').mockResolvedValue({
        dex: "Meteora", price: 99, fee: 0.002, amountOut: 990.1
      });

      const dexRouter = new DexRouterService();
      const best = await dexRouter.route(mockOrder as any);

      expect(best.dex).toBe("Raydium");
      expect(best.amountOut).toBe(1000.5);
      
      raydiumSpy.mockRestore();
      meteoraSpy.mockRestore();
    });

    it("3. Executes swap returns txHash and executedPrice", async () => {
      const dexRouter = new DexRouterService();
      const execResult = await dexRouter.executeOnDex("Meteora", mockOrder as any);
      
      expect(execResult).toHaveProperty("txHash");
      expect(execResult.txHash).toMatch(/^mock_/);
      expect(typeof execResult.executedPrice).toBe("number");
    });
  });

  describe("2. Order Queue Behavior", () => {
    let worker: Worker<TestJobData, TestJobResult, string>; 

    afterEach(async () => {
        await worker?.close();
        await queue.drain(true);
    });
    
    it("4. Processes a single queued job successfully", async () => {
      const testId = "queue-test-1";
      let processed = false;
      
      worker = new Worker<TestJobData, TestJobResult, string>( 
        TEST_QUEUE_NAME,
        async (job: Job<TestJobData, TestJobResult, string>) => { 
          if (job.data.orderId === testId) processed = true;
          return { status: "OK" }; 
        },
        { connection }
      );

      await queue.add("execute-order", { orderId: testId });

      await new Promise((resolve) => {
        worker.on("completed", (job) => {
          if (job.data.orderId === testId) resolve(true);
        });
      });

      expect(processed).toBe(true);
    });

    it("5. Respects concurrency limit of 1 (processes jobs sequentially)", async () => {
        const testIds = ["conc-test-2", "conc-test-3"];
        const processed: string[] = [];
        const jobDuration = 100; 
        
        worker = new Worker<TestJobData, TestJobResult, string>(
          TEST_QUEUE_NAME,
          async (job) => {
            await new Promise((r) => setTimeout(r, jobDuration)); 
            processed.push(job.data.orderId);
            return { status: "OK" }; 
          },
          { connection, concurrency: 1 }
        );

        await queue.add("execute-order", { orderId: testIds[0] });
        await queue.add("execute-order", { orderId: testIds[1] });
        
        await new Promise((resolve) => {
            let completedCount = 0;
            worker.on("completed", (job) => {
                if (testIds.includes(job.data.orderId)) {
                    completedCount++;
                    if (completedCount === testIds.length) resolve(true);
                }
            });
        });

        expect(processed).toEqual(["conc-test-2", "conc-test-3"]);
    }, 1000); 

    it("6. Applies exponential back-off and retries failed jobs (3 attempts)", async () => {
      const testId = "retry-test-4";
      let attemptCount = 0;
      
      vi.spyOn(OrderRepository, 'get').mockResolvedValue(mockOrder);
      vi.spyOn(OrderRepository, 'update').mockResolvedValue(mockOrder);

      worker = new Worker<TestJobData, TestJobResult, string>(
        TEST_QUEUE_NAME,
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error("Temporary DB lock error"); 
          }
          return { status: "Success on third try" }; 
        },
        { connection }
      );

      const job = await queue.add("execute-order", { orderId: testId }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 50 } 
      });
      
      await job.waitUntilFinished(queueEvents); 
      
      expect(attemptCount).toBe(3);
    }, 2000);
  });
  
  describe("3. WebSocket Lifecycle Tests (Handshake Only)", () => {
    it("8. Sends 'connected' message upon initial handshake", async () => {
      const orderId = "ws-handshake-test-1";
      const { ws } = connectAndCollect(orderId);
      
      const message: any = await new Promise((resolve) => {
        ws.on("message", (msg) => resolve(JSON.parse(msg.toString())));
      });

      expect(message.event).toBe("connected");
      expect(message.orderId).toBe(orderId);
      
      ws.close();
    });
    
    function connectAndCollect(orderId: string): { ws: WebSocket, messages: any[] } {
        const ws = new WebSocket(`ws://localhost:${TEST_PORT}/api/orders/ws?orderId=${orderId}`);
        const messages: any[] = [];
        ws.on("message", (msg) => messages.push(JSON.parse(msg.toString())));
        return { ws, messages };
    }
  });
});