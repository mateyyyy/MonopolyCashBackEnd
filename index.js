import express from "express";
import {
  cobrarBanco,
  configGame,
  declararBancarrota,
  getConfig,
  getPlayerInfo,
  getTransfers,
  pickPlayer,
  responderCobroBanco,
  transferMoney,
  unpickPlayer,
  verificarCobroBancoPendiente,
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
app.get("/transfers", getTransfers);
app.post("/receive", cobrarBanco);
app.get("/requests/:playerName", verificarCobroBancoPendiente);
app.post("/requestsRespond", responderCobroBanco);
app.patch("/bancarrota/:name", declararBancarrota);
