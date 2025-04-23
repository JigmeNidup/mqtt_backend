require("dotenv").config();
const express = require("express");
const fs = require("fs");
const moment = require("moment");
const mqtt = require("mqtt");
const path = require("path");
const { Pool } = require("pg");
const sendMail = require("./mailer");
const cors = require("cors");

const app = express();
app.use(cors());

const port = 3002;

let caCert = "";
try {
  const absolutePath = path.join(process.cwd(), "./ca.crt");
  caCert = fs.readFileSync(absolutePath);
} catch (error) {
  console.log(error);
}

// Set up PostgreSQL connection
const pool = new Pool({
  user: process.env.PSQL_USER,
  host: process.env.PSQL_HOST,
  database: process.env.PSQL_DATABASE,
  password: process.env.PSQL_PASSWORD,
  port: process.env.PSQL_PORT,
  ssl: {
    rejectUnauthorized: true,
    // ca: process.env.PG_CA_CERT // If using a trusted CA for secure connection
    ca: caCert.toString(),
  },
});

// Set up MQTT client
let mqttClient = mqtt.connect({
  host: process.env.NEXT_PUBLIC_MQTT_BROKER_HOST,
  port: parseInt(process.env.NEXT_PUBLIC_MQTT_BROKER_PORT, 10),
  username: process.env.NEXT_PUBLIC_MQTT_BROKER_USER,
  password: process.env.NEXT_PUBLIC_MQTT_BROKER_PASSWORD,
  protocol: "mqtts",
});
9;

// Listen to MQTT messages on a specific topic
mqttClient.on("connect", () => {
  mqttClient.subscribe("patient/1/eeg", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topic patient/1/eeg`);
  });

  mqttClient.subscribe("patient/1/ecg", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topic patient/1/ecg`);
  });
  mqttClient.subscribe("patient/1/emg", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topicpatient/1/emg`);
  });
  mqttClient.subscribe("patient/1/eog", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topic patient/1/eog`);
  });
  mqttClient.subscribe("patient/1/temperature/body", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topic patient/1/temperature/body`);
  });

  mqttClient.subscribe("patient/1/spo2", (err) => {
    if (err) console.error("MQTT subscription error:", err);
    else console.log(`Subscribed to topic patient/1/sp02`);
  });

  console.log("MQTT connected");
});

mqttClient.on("error", (error) => {
  console.error("Connection error:", error);
});

let temp_alerts = true;

setInterval(() => {
  temp_alerts = true;
}, 1000 * 60);

let user_email = "jigmenidup8102003@gmail.com";

// Insert data into PostgreSQL when a message is received
mqttClient.on("message", async (topic, message) => {
  try {
    // const data = JSON.parse(message.toString());
    const data = message.toString();

    let topicArr = topic.split("/");

    let device_id = "esp-1";

    // console.log(data, topicArr);

    if (topicArr[2] === "eeg") {
      await pool.query(
        `INSERT INTO eeg (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    } else if (topicArr[2] === "ecg") {
      await pool.query(
        `INSERT INTO ecg (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    } else if (topicArr[2] === "emg") {
      await pool.query(
        `INSERT INTO emg (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    } else if (topicArr[2] === "eog") {
      await pool.query(
        `INSERT INTO eog (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    } else if (topicArr[2] === "temperature" && topicArr[3] === "body") {
      if (temp_alerts) {
        if (Number(data) > 40.3) {
          console.log("sent mail");

          sendMail({
            to: user_email,
            subject: "Body Temperature Alerts!",
            text: "",
            html: `<div>Your Body temperature is HIGH ${data}*C <br>Risk of Hyperthermia </div>`,
          });

          temp_alerts = false;

          await pool.query(
            "INSERT INTO notifications(user_email,type,message,timestamp) VALUES($1,$2,$3,$4)",
            [
              user_email,
              "temperature",
              `Your Body temperature is HIGH ${data}*C, Risk of Hyperthermia`,
              moment(),
            ]
          );
        }
      }

      await pool.query(
        `INSERT INTO temperature (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    } else if (topicArr[2] === "spo2") {
      await pool.query(
        `INSERT INTO spo2 (device_topic, device_id, data, "timestamp") VALUES ($1, $2, $3, $4)`,
        [topic, device_id, data, moment()]
      );
    }
    // console.log("Data inserted successfully.");
  } catch (error) {
    console.error("Error processing message:", error);
  }
});

// API route to retrieve sensor data
app.get("/api/data/:type", async (req, res) => {
  try {
    const type = req.params.type;
    let result;
    if (type === "eeg") {
      result = await pool.query(
        "SELECT * FROM eeg ORDER BY id DESC LIMIT 3000"
      );
      res.json({ result: true, data: result.rows });
    } else if (type === "ecg") {
      result = await pool.query(
        "SELECT * FROM ecg ORDER BY id DESC LIMIT 3000"
      );
      res.json({ result: true, data: result.rows });
    } else if (type === "emg") {
      result = await pool.query(
        "SELECT * FROM emg ORDER BY id DESC LIMIT 3000"
      );
      res.json({ result: true, data: result.rows });
    } else if (type === "eog") {
      result = await pool.query(
        "SELECT * FROM eog ORDER BY id DESC LIMIT 3000"
      );
      res.json({ result: true, data: result.rows });
    } else if (type === "temperature") {
      result = await pool.query(
        "SELECT * FROM temperature ORDER BY id DESC LIMIT 300"
      );
      res.json({ result: true, data: result.rows });
    } else if (type === "spo2") {
      result = await pool.query(
        "SELECT * FROM spo2 ORDER BY id DESC LIMIT 3000"
      );
      res.json({ result: true, data: result.rows });
    } else {
      res.json({ result: false });
    }

    // res.json(result.rows);
  } catch (error) {
    console.error("Error fetching sensor data:", error);
    res.json({ result: false });
  }
});

app.get("/", async (req, res) => {
  res.json({ test: "MQTT BACKEND" });
});
// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
