import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { appRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.js";
import { config } from "./config.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.allowedOrigin }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("combined"));

app.use("/api", appRouter);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`DGC IMS API listening on port ${config.port}`);
});
