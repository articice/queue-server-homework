const express = require('express');
const router = express.Router();
const amqp = require('amqplib');
const promiseRetry = require('promise-retry');

let connection, channel;

async function connect() {
  try {
    const amqpServer = 'amqp://user:secret@rabbit';
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    channel.on('close', () => {
      console.error("RabbitMQ channel closed");
      process.exit(2);
    })
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

connect();

// Get message from queue
router.get('/:queue_name', async (req, res, next) => {

  let timeout = req.query.timeout || 10;

  if (isNaN(timeout = parseInt(timeout))) {
    res.status(400);
    res.send("timeout is not a number");
    return;
  }

  const queue = req.params['queue_name'];
  let notReceived = true;

  try {
    await channel.assertQueue(queue, {
      durable: false
    });

    await promiseRetry(async (retry, number) => {
      const msg = await channel.get(queue, {
        noAck: false
      });

      if (msg) {
        notReceived = false;
        res.contentType('application/json');
        res.send(msg.content);
        channel.ack(msg);
      } else retry();
    }, {
      factor: 1,
      retries: timeout/1000, //poll every second
      maxTimeout: 1000,
    })
  } catch (err) {
    if (err) {
      res.status(500);
      res.send(err.message);
    } else if (notReceived) {
      res.status(204);
      res.send();
    } else {
      res.status(500);
      res.send("Unknown error");
    }
  }
});

// Put message into queue
router.post('/:queue_name', async (req, res, next) => {
  const queue = req.params['queue_name'];
  const msg = req.body;

  try {
    await channel.assertQueue(queue, {
      durable: false
    });

    await channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
    res.send(`Sent to queue ${queue}`);
  } catch (err) {
    res.status(500);
    res.send(err.message || "Unknown error");
  }
})

module.exports = router;
