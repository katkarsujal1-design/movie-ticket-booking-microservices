const config = require("../config");
const { createKafkaProducer } = require("../config/kafka");

function topicFor(eventType) {
  if (eventType === "PAYMENT_SUCCESS") return config.kafka.successTopic;
  if (eventType === "PAYMENT_FAILED") return config.kafka.failedTopic;
  return config.kafka.refundedTopic;
}

function createPaymentEventPublisher(suppliedProducer) {
  const producer = suppliedProducer || createKafkaProducer();
  let connected = false;

  async function publish(eventType, payment) {
    try {
      if (!connected) {
        await producer.connect();
        connected = true;
      }
      const payload = {
        eventType,
        paymentId: payment.paymentId,
        bookingId: payment.bookingId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        status: payment.status,
        failureReason: payment.failureReason,
        timestamp: new Date().toISOString()
      };
      await producer.send({
        topic: topicFor(eventType),
        messages: [{ key: payment.bookingId, value: JSON.stringify(payload) }]
      });
      console.log(`Payment event published: ${eventType} for ${payment.paymentId}`);
    } catch (error) {
      console.error(`Payment event publish failed for ${payment.paymentId}:`, error.message);
    }
  }

  async function stop() {
    if (connected) await producer.disconnect();
  }

  return { publish, stop };
}

module.exports = { createPaymentEventPublisher };
