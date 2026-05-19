import winston from "winston";

export const logger: any = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "fazendas-up-api" },
  transports: [new winston.transports.Console()],
});
