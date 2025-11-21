export type OrderStatus = "pending" | "routing" | "building" | "submitted" | "confirmed" | "failed";

export interface Order {
  id: string;
  type: "market" | "limit" | "sniper";
  tokenIn: string;
  tokenOut: string;
  amount: number;
  status: OrderStatus;
  chosenDex?: "Raydium" | "Meteora";
  txHash?: string;
  executedPrice?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt?: string;
}
