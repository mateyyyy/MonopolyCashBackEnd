import express from "express";
import {
  configGame,
  getConfig,
  getPlayerInfo,
  pickPlayer,
  transferMoney,
  unpickPlayer,
} from "./controller/config.js";
import cors from "cors";
const app = express();
const PORT = 3000;

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.post("/config", configGame);
app.get("/config", getConfig);
app.post("/config/pick", pickPlayer);
app.post("/config/unpick", unpickPlayer);
app.post("/transfer", transferMoney);
app.get("/player/:name", getPlayerInfo);
