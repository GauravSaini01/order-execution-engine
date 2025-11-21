import { createServer } from "./server";
import { startOrderWorker } from "./workers/order.worker";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 3000);

async function main() {
  const server = await createServer(); 
  
  startOrderWorker(server.pg); 

  server.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    server.log.info(`Server listening at ${address}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});