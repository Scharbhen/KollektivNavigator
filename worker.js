const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results_data.json');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

async function startWorker() {
  console.log('Starting RabbitMQ worker...');
  let connection;
  
  // Retry logic for connection
  while (!connection) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      console.log('Worker connected to RabbitMQ');
      
      connection.on('error', (err) => {
        console.error('RabbitMQ connection error', err);
        process.exit(1);
      });
      
      connection.on('close', () => {
        console.error('RabbitMQ connection closed');
        process.exit(1);
      });
      
    } catch (err) {
      console.error('Worker failed to connect to RabbitMQ, retrying in 5s...', err.message);
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  const channel = await connection.createChannel();
  const replyQueue = 'demo-responses';
  
  await channel.assertQueue(replyQueue, { durable: true });
  console.log(`Worker listening on queue: ${replyQueue}`);

  channel.consume(replyQueue, (msg) => {
    if (msg !== null) {
      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`Worker received result for: ${content.id || content.media_id}`);
        
        // Read existing results
        let results = {};
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(RESULTS_FILE)) {
          try {
            results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
          } catch (e) {
            console.error('Error reading results file, starting fresh');
          }
        }
        
        // Save new result
        const mediaId = content.id || content.media_id;
        if (mediaId) {
          results[mediaId] = {
            status: content.extraction_error ? 'error' : 'completed',
            result: content,
            updatedAt: new Date().toISOString()
          };
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        }
        
        channel.ack(msg);
      } catch (e) {
        console.error('Error processing message:', e);
        // Don't requeue bad messages to avoid infinite loops
        channel.nack(msg, false, false);
      }
    }
  });
}

startWorker().catch(console.error);
