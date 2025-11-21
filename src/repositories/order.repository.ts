import { Order } from "../models/order.model";
import { DBClient } from "./db.interface";
import { QueryResult } from "pg";

const mapRowToOrder = (row: any): Order => ({
  id: row.id,
  type: row.type,
  tokenIn: row.token_in,
  tokenOut: row.token_out,
  amount: parseFloat(row.amount),
  status: row.status,
  chosenDex: row.chosen_dex,
  txHash: row.tx_hash,
  executedPrice: row.executed_price ? parseFloat(row.executed_price) : undefined,
  failureReason: row.failure_reason,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at ? row.updated_at.toISOString() : undefined,
});

interface IOrderRepository {
    create(client: DBClient, order: Order): Promise<Order>;
    update(client: DBClient, id: string, patch: Partial<Order>): Promise<Order>;
    get(client: DBClient, id: string): Promise<Order | undefined>;
    list(client: DBClient): Promise<Order[]>;
}

export const OrderRepository: IOrderRepository = { 

  async create(client: DBClient, order: Order): Promise<Order> {
    const sql = `
      INSERT INTO orders (id, type, token_in, token_out, amount, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      order.id,
      order.type,
      order.tokenIn,
      order.tokenOut,
      order.amount,
      order.status,
      order.createdAt,
    ];
    
    const result: QueryResult = await client.query(sql, values);
    return mapRowToOrder(result.rows[0]);
  },

  async update(client: DBClient, id: string, patch: Partial<Order>): Promise<Order> {
    const fields = [];
    const values = [];
    let index = 1;
    
    type OrderKey = keyof Partial<Order>; 

    for (const keyString in patch) {
        const key = keyString as OrderKey; 
        const value = patch[key];

      if (value !== undefined && key !== 'id' && key !== 'createdAt') {
        const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        fields.push(`${dbKey} = $${index++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return this.get(client, id) as Promise<Order>; 
    }
    
    fields.push(`updated_at = $${index++}`);
    values.push(new Date().toISOString());

    values.push(id); 

    const sql = `
      UPDATE orders
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING *
    `;

    const result: QueryResult = await client.query(sql, values);
    if (result.rows.length === 0) {
      throw new Error("Order not found");
    }
    return mapRowToOrder(result.rows[0]);
  },

  async get(client: DBClient, id: string): Promise<Order | undefined> {
    const sql = "SELECT * FROM orders WHERE id = $1";
    const result: QueryResult = await client.query(sql, [id]);
    
    if (result.rows.length === 0) return undefined;
    return mapRowToOrder(result.rows[0]);
  },

  async list(client: DBClient): Promise<Order[]> {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    const result: QueryResult = await client.query(sql);
    return result.rows.map(mapRowToOrder);
  }
};