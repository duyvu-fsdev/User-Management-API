import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import sequelize from "./config/dbConnect";
import router from "./routes/routes";

dotenv.config();
let app = express();
let port = process.env.PORT;

const options: cors.CorsOptions = { origin: true };

app.use(cors(options));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).send({ response: "duyvu-fsdev" });
});

// connect to database

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection to the database has been established successfully.");
    console.log("_____________________________________________________________");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
  app.listen(port, () => console.log(`Server listening on port ${port}`));
})();
