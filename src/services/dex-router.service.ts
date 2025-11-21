import { MockDexClient } from "./dex/mock-dex";

const dexClient = new MockDexClient();

export class DexRouterService {
  async route(order: { id: string; tokenIn: string; tokenOut: string; amount: number }) {
    const [r, m] = await Promise.all([
      dexClient.getRaydiumQuote(order.tokenIn, order.tokenOut, order.amount),
      dexClient.getMeteoraQuote(order.tokenIn, order.tokenOut, order.amount)
    ]);

    const best = r.amountOut >= m.amountOut ? r : m;
    return best;
  }

  async executeOnDex(dex: "Raydium" | "Meteora", order: { id: string; tokenIn: string; tokenOut: string; amount: number }) {
    return dexClient.executeSwap(dex, order);
  }
}
