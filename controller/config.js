import fs from "fs";

export const configGame = (req, res) => {
  const config = req.body;

  if (
    typeof config.passGoBonus !== "number" ||
    typeof config.startMoney !== "number" ||
    !Array.isArray(config.players)
  ) {
    return res.status(400).json({ message: "Configuración inválida" });
  }

  // Agregar money y picked a cada jugador
  const playersWithExtras = config.players.map((player) => ({
    ...player,
    money: config.startMoney,
    picked: false,
  }));

  const newConfig = {
    ...config,
    players: playersWithExtras,
  };

  fs.writeFile("config.txt", JSON.stringify(newConfig, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar configuración:", err);
      return res
        .status(500)
        .json({ message: "Error al guardar configuración" });
    }

    res.status(200).json({
      status: "success",
      message: "Configuración guardada correctamente",
    });
  });
};

export const getConfig = (req, res) => {
  fs.readFile("config.txt", "utf-8", (err, data) => {
    if (err) {
      console.error("Error al leer configuración:", err);
      return res.status(500).json({ message: "Error al leer configuración" });
    }
    try {
      const config = JSON.parse(data);
      res.status(200).json(config);
    } catch (parseErr) {
      console.error("Error al parsear configuración:", parseErr);
      res.status(500).json({ message: "Error al parsear configuración" });
    }
  });
};

export const pickPlayer = (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Falta el nombre del jugador" });
  }

  fs.readFile("config.txt", "utf-8", (err, data) => {
    if (err) {
      console.error("Error al leer configuración:", err);
      return res.status(500).json({ message: "Error al leer configuración" });
    }

    let config;
    try {
      config = JSON.parse(data);
    } catch (parseErr) {
      console.error("Error al parsear configuración:", parseErr);
      return res
        .status(500)
        .json({ message: "Error al parsear configuración" });
    }

    const updatedPlayers = config.players.map((player) =>
      player.name === name ? { ...player, picked: true } : player
    );

    const updatedConfig = { ...config, players: updatedPlayers };

    fs.writeFile(
      "config.txt",
      JSON.stringify(updatedConfig, null, 2),
      (err) => {
        if (err) {
          console.error("Error al guardar configuración:", err);
          return res
            .status(500)
            .json({ message: "Error al guardar configuración" });
        }

        res.status(200).json({
          status: "success",
          message: "Jugador marcado como seleccionado",
        });
      }
    );
  });
};

export const unpickPlayer = (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "Falta el nombre del jugador" });
  }

  // Leer archivo config.txt
  fs.readFile("config.txt", "utf8", (err, data) => {
    if (err) {
      console.error("Error leyendo config.txt:", err);
      return res
        .status(500)
        .json({ status: "error", message: "Error interno" });
    }

    let config;
    try {
      config = JSON.parse(data);
    } catch {
      return res
        .status(500)
        .json({ status: "error", message: "Archivo corrupto" });
    }

    // Buscar jugador y cambiar picked a false
    const player = config.players.find((p) => p.name === name);
    if (!player) {
      return res
        .status(404)
        .json({ status: "error", message: "Jugador no encontrado" });
    }

    player.picked = false;

    // Guardar config actualizada
    fs.writeFile("config.txt", JSON.stringify(config, null, 2), (err) => {
      if (err) {
        console.error("Error guardando config.txt:", err);
        return res
          .status(500)
          .json({ status: "error", message: "Error interno" });
      }
      res.json({ status: "success", message: `Jugador ${name} despickeado` });
    });
  });
};

const configPath = "./config.txt";

export const transferMoney = (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount || isNaN(amount)) {
    return res
      .status(400)
      .json({ status: "error", message: "Datos inválidos" });
  }
  const numericAmount = Number(amount);
  if (numericAmount <= 0) {
    return res
      .status(400)
      .json({ status: "error", message: "El monto debe ser mayor a 0" });
  }

  fs.readFile(configPath, "utf-8", (err, data) => {
    if (err)
      return res
        .status(500)
        .json({ status: "error", message: "Error al leer archivo" });

    let config;
    try {
      config = JSON.parse(data);
    } catch (e) {
      return res
        .status(500)
        .json({ status: "error", message: "JSON mal formado" });
    }

    const sender = config.players.find((p) => p.name === from);
    const receiver = config.players.find((p) => p.name === to);

    if (!sender || !receiver) {
      return res
        .status(404)
        .json({ status: "error", message: "Jugador no encontrado" });
    }

    if (sender.money < amount) {
      return res
        .status(400)
        .json({ status: "error", message: "Fondos insuficientes" });
    }

    sender.money -= amount;
    receiver.money += amount;

    fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
      if (err)
        return res
          .status(500)
          .json({ status: "error", message: "Error al guardar archivo" });

      return res.json({
        status: "success",
        message: "Transferencia realizada",
        sender,
        receiver,
      });
    });
  });
};

export const getPlayerInfo = (req, res) => {
  const { name } = req.params;

  if (!name) {
    return res
      .status(400)
      .json({ status: "error", message: "Falta el nombre del jugador" });
  }

  fs.readFile("config.txt", "utf-8", (err, data) => {
    if (err) {
      console.error("Error al leer config.txt:", err);
      return res
        .status(500)
        .json({ status: "error", message: "Error al leer configuración" });
    }

    let config;
    try {
      config = JSON.parse(data);
    } catch (e) {
      return res
        .status(500)
        .json({ status: "error", message: "Archivo corrupto" });
    }

    const player = config.players.find((p) => p.name === name);

    if (!player) {
      return res
        .status(404)
        .json({ status: "error", message: "Jugador no encontrado" });
    }

    return res.status(200).json({ status: "success", player });
  });
};
