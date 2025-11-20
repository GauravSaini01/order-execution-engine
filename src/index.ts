import fastify from "fastify";

const app = fastify();

app.get("/", async () => {
  return { status: "Order Execution Engine Running" };
});

app.get("/health", async (_, reply) => {
    return reply.send({ message : "Hello World",status: "OK", method: "GET" });
});

async function start() {
  try {
    await app.listen({ port: 3000 });
    console.log("Server running on http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();

export default app;
