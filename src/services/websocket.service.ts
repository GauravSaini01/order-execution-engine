import { WebSocket } from "ws";

const clientMap = new Map<string, WebSocket[]>();

export function registerWsClient(orderId: string, ws: WebSocket) {
  if (!clientMap.has(orderId)) clientMap.set(orderId, []);
  clientMap.get(orderId)!.push(ws);

  ws.on("close", () => {
    clientMap.set(
      orderId,
      clientMap.get(orderId)!.filter(c => c !== ws)
    );
  });
}

export function sendEvent(
  orderId: string,
  status: string,
  payload: unknown = {}
) {
  const clients = clientMap.get(orderId) || [];

  const message = {
    orderId,
    status,
    payload
  };

  for (const ws of clients) {
    ws.send(JSON.stringify(message));
  }
}
