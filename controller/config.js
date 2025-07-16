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

  // Jugadores normales
  const playersWithExtras = config.players.map((player) => ({
    ...player,
    money: config.startMoney,
    picked: false,
  }));

  // Agregar jugador "Banco"
  const banco = {
    name: "Banco",
    money: 99999999999,
    picked: true, // no seleccionable
  };

  const newConfig = {
    ...config,
    players: [...playersWithExtras, banco],
  };

  // Guardar configuración
  fs.writeFile("config.txt", JSON.stringify(newConfig, null, 2), (err) => {
    if (err) {
      console.error("Error al guardar configuración:", err);
      return res
        .status(500)
        .json({ message: "Error al guardar configuración" });
    }

    // Reiniciar transfers.txt
    fs.writeFile("transfers.txt", "[]", (err) => {
      if (err) {
        console.error("Error al reiniciar transfers.txt:", err);
        return res
          .status(500)
          .json({ message: "Error al reiniciar transfers.txt" });
      }

      res.status(200).json({
        status: "success",
        message: "Configuración guardada y transferencias reiniciadas",
      });
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

    if (sender.money < numericAmount) {
      return res
        .status(400)
        .json({ status: "error", message: "Fondos insuficientes" });
    }

    sender.money -= numericAmount;
    if (receiver.name != "Banco") {
      receiver.money += numericAmount;
    }

    // Guardar cambios en config.txt
    fs.writeFile(configPath, JSON.stringify(config, null, 2), (err) => {
      if (err)
        return res
          .status(500)
          .json({ status: "error", message: "Error al guardar archivo" });

      // Guardar transferencia en transfers.txt
      const transfer = {
        from,
        to,
        amount: numericAmount,
        timestamp: new Date().toISOString(),
      };

      fs.readFile("transfers.txt", "utf-8", (readErr, transferData) => {
        let transfers = [];

        if (!readErr) {
          try {
            transfers = JSON.parse(transferData);
            if (!Array.isArray(transfers)) transfers = [];
          } catch {
            transfers = [];
          }
        }

        transfers.push(transfer);

        fs.writeFile(
          "transfers.txt",
          JSON.stringify(transfers, null, 2),
          (writeErr) => {
            if (writeErr) {
              console.error("Error al guardar transferencia:", writeErr);
              return res.status(500).json({
                status: "error",
                message: "Transferencia guardada parcialmente",
              });
            }

            return res.json({
              status: "success",
              message: "Transferencia realizada",
              sender,
              receiver,
            });
          }
        );
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

export const getTransfers = (req, res) => {
  fs.readFile("transfers.txt", "utf-8", (err, data) => {
    if (err) {
      console.error("Error al leer transfers.txt:", err);
      return res
        .status(500)
        .json({ status: "error", message: "No se pudo leer el historial" });
    }

    let transfers;
    try {
      transfers = JSON.parse(data);
      if (!Array.isArray(transfers)) throw new Error();
    } catch {
      return res.status(500).json({
        status: "error",
        message: "El archivo de transacciones está corrupto",
      });
    }

    res.status(200).json({
      status: "success",
      transfers,
    });
  });
};
export const cobrarBanco = (req, res) => {
  const { to, amount } = req.body;

  if (!to || !amount || isNaN(amount)) {
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

    const receiver = config.players.find((p) => p.name === to);
    if (!receiver) {
      return res
        .status(404)
        .json({ status: "error", message: "Jugador no encontrado" });
    }

    const generateId = () =>
      Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    const newRequest = {
      id: generateId(),
      to,
      amount: numericAmount,
      timestamp: new Date().toISOString(),
      acceptedBy: [],
      status: "pending",
    };

    fs.readFile("requests.txt", "utf-8", (readErr, reqData) => {
      let requests = [];

      if (!readErr) {
        try {
          requests = JSON.parse(reqData);
          if (!Array.isArray(requests)) requests = [];
        } catch {
          requests = [];
        }
      }

      requests.push(newRequest);

      fs.writeFile(
        "requests.txt",
        JSON.stringify(requests, null, 2),
        (writeErr) => {
          if (writeErr) {
            console.error("Error al guardar solicitud:", writeErr);
            return res
              .status(500)
              .json({ status: "error", message: "Error al guardar solicitud" });
          }

          return res.json({
            status: "success",
            message:
              "Solicitud enviada, esperando confirmación de todos los jugadores",
            request: newRequest,
          });
        }
      );
    });
  });
};

export const responderCobroBanco = (req, res) => {
  const { id, playerName, accept } = req.body;
  const configPath = "./config.txt";

  if (!id || !playerName || typeof accept !== "boolean") {
    return res
      .status(400)
      .json({ status: "error", message: "Datos inválidos" });
  }

  fs.readFile("requests.txt", "utf-8", (err, data) => {
    if (err)
      return res
        .status(404)
        .json({ status: "error", message: "No hay solicitudes pendientes" });

    let requests;
    try {
      requests = JSON.parse(data);
      if (!Array.isArray(requests)) requests = [];
    } catch {
      return res
        .status(500)
        .json({ status: "error", message: "Error al parsear solicitudes" });
    }

    const request = requests.find((r) => r.id === id && r.status === "pending");
    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Solicitud no encontrada o procesada",
      });
    }

    if (!request.responses) request.responses = {};
    request.responses[playerName] = accept;

    fs.readFile(configPath, "utf-8", (errConfig, configData) => {
      if (errConfig) {
        return res
          .status(500)
          .json({ status: "error", message: "Error al leer config" });
      }

      let config;
      try {
        config = JSON.parse(configData);
      } catch {
        return res
          .status(500)
          .json({ status: "error", message: "Error al parsear config" });
      }

      const playersToRespond = config.players.filter(
        (p) => p.name !== "Banco" && p.name !== request.to
      );

      const allPlayersResponded = playersToRespond.every(
        (p) => request.responses[p.name] !== undefined
      );
      const allAccepted = playersToRespond.every(
        (p) => request.responses[p.name] === true
      );

      request.acceptedBy = playersToRespond
        .filter((p) => request.responses[p.name] === true)
        .map((p) => p.name);

      if (allPlayersResponded) {
        if (allAccepted) {
          const receiver = config.players.find((p) => p.name === request.to);
          if (receiver) {
            receiver.money += request.amount;
          }

          const transfer = {
            from: "Banco",
            to: request.to,
            amount: request.amount,
            timestamp: new Date().toISOString(),
          };

          fs.readFile("transfers.txt", "utf-8", (readErr, transferData) => {
            let transfers = [];
            if (!readErr) {
              try {
                transfers = JSON.parse(transferData);
                if (!Array.isArray(transfers)) transfers = [];
              } catch {
                transfers = [];
              }
            }

            transfers.push(transfer);

            fs.writeFile(
              "transfers.txt",
              JSON.stringify(transfers, null, 2),
              (errTransfers) => {
                if (errTransfers) {
                  return res.status(500).json({
                    status: "error",
                    message: "Error al guardar la transferencia",
                  });
                }

                fs.writeFile(
                  configPath,
                  JSON.stringify(config, null, 2),
                  (errWrite) => {
                    if (errWrite) {
                      return res.status(500).json({
                        status: "error",
                        message: "Error al guardar config",
                      });
                    }

                    request.status = "completed";

                    fs.writeFile(
                      "requests.txt",
                      JSON.stringify(requests, null, 2),
                      (writeErr) => {
                        if (writeErr) {
                          return res.status(500).json({
                            status: "error",
                            message: "Error al actualizar solicitudes",
                          });
                        }

                        return res.json({
                          status: "success",
                          message: "Todos aceptaron. Monto acreditado.",
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        } else {
          request.status = "cancelled";

          fs.writeFile(
            "requests.txt",
            JSON.stringify(requests, null, 2),
            (writeErr) => {
              if (writeErr) {
                return res.status(500).json({
                  status: "error",
                  message: "Error al actualizar solicitudes",
                });
              }

              return res.json({
                status: "cancelled",
                message: "Un jugador rechazó el cobro. Operación cancelada.",
              });
            }
          );
        }
      } else {
        fs.writeFile(
          "requests.txt",
          JSON.stringify(requests, null, 2),
          (errWrite) => {
            if (errWrite) {
              return res.status(500).json({
                status: "error",
                message: "Error al guardar respuesta",
              });
            }

            return res.json({
              status: "pending",
              message: "Respuesta registrada",
            });
          }
        );
      }
    });
  });
};

export const verificarCobroBancoPendiente = (req, res) => {
  const configPath = "./config.txt";
  const { playerName } = req.params;

  fs.readFile("requests.txt", "utf-8", (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ status: "error", message: "Error al leer" });
    }

    let requests = [];
    try {
      requests = JSON.parse(data);
    } catch {
      requests = [];
    }

    const pendientes = requests.filter((req) => {
      if (req.status !== "pending") return false; // solo pendientes
      if (req.to === playerName) return false; // no mostrar solicitud al creador
      if (!req.responses) return true;
      return req.responses[playerName] === undefined; // pendiente para este jugador
    });

    res.json({ status: "success", requests: pendientes });
  });
};
