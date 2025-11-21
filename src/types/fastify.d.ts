import fastifyPostgres from '@fastify/postgres';

type FastifyPostgresInstance = typeof fastifyPostgres extends 
    (plugin: any, opts: any, done: any) => infer R
    ? R
    : never;

declare module 'fastify' {
  interface FastifyInstance {
    pg: FastifyPostgresInstance['pg']; 
  }
}