import { describe, it, expect, beforeEach } from "vitest";
import { MockDexClient } from "../services/dex/mock-dex";

describe("MockDexClient", () => {
  let client: MockDexClient;

  beforeEach(() => {
    client = new MockDexClient();
  });

  it("returns a numeric Raydium quote", async () => {
    const quote = await client.getRaydiumQuote("SOL", "USDC", 1);
    expect(quote).toHaveProperty("dex", "Raydium");
    expect(quote.price).toBeTypeOf("number");
    expect(quote.amountOut).toBeTypeOf("number");
    expect(quote.fee).toBeTypeOf("number");
  });

  it("returns a numeric Meteora quote", async () => {
    const quote = await client.getMeteoraQuote("SOL", "USDC", 1);
    expect(quote).toHaveProperty("dex", "Meteora");
    expect(quote.price).toBeTypeOf("number");
    expect(quote.amountOut).toBeTypeOf("number");
    expect(quote.fee).toBeTypeOf("number");
  });
});
