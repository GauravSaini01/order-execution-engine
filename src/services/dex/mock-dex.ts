import { sleep } from "../../utils/sleep";
import { v4 as uuidv4 } from "uuid";

export class MockDexClient {
  private basePrice = 100;

  async getRaydiumQuote(tokenIn: string, tokenOut: string, amount: number) {
    await sleep(200 + Math.random() * 150);
    const price = this.basePrice * (0.98 + Math.random() * 0.04);
    return { dex: "Raydium", price, fee: 0.003, amountOut: amount * price };
  }

  async getMeteoraQuote(tokenIn: string, tokenOut: string, amount: number) {
    await sleep(200 + Math.random() * 150);
    const price = this.basePrice * (0.97 + Math.random() * 0.05);
    return { dex: "Meteora", price, fee: 0.002, amountOut: amount * price };
  }

  async executeSwap(
    dex: "Raydium" | "Meteora",
    order: { id: string; tokenIn: string; tokenOut: string; amount: number }
  ) {
    await sleep(300 + Math.random() * 200);
    await sleep(2000 + Math.random() * 1000);
    const txHash = "mock_" + uuidv4().replace(/-/g, "").slice(0, 24);
    const executedPrice = this.basePrice * (0.975 + Math.random() * 0.05);
    return { txHash, executedPrice };
  }
}
