import { FastifyPluginAsync } from "fastify";
import fastifyPostgres from "@fastify/postgres";
import fp from "fastify-plugin";

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }

  fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL,
  });

  fastify.log.info("PostgreSQL connection pool initialized.");
};

export default fp(dbPlugin);
