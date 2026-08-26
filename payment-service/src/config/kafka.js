const { Kafka, logLevel } = require("kafkajs");
const config = require("./index");

function createKafkaProducer() {
  return new Kafka({
    clientId: config.kafka.clientId,
    brokers: [config.kafka.broker],
    logLevel: logLevel.WARN
  }).producer();
}

module.exports = { createKafkaProducer };
