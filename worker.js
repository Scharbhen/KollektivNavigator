const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const RESULTS_FILE = path.join(DATA_DIR, 'results_data.json');
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const REPLY_QUEUE = process.env.RABBITMQ_REPLY_QUEUE || 'demo-responses';
const REPLY_QUEUE_DURABLE = process.env.RABBITMQ_REPLY_QUEUE_DURABLE !== 'false';

function logInfo(event, payload = {}) {
  console.log(JSON.stringify({ level: 'info', scope: 'rabbit-worker', event, ...payload }));
}

function logError(event, payload = {}) {
  console.error(JSON.stringify({ level: 'error', scope: 'rabbit-worker', event, ...payload }));
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readResults() {
  ensureDataDir();
  if (!fs.existsSync(RESULTS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  } catch (e) {
    console.error('Error reading results file, starting fresh');
    return {};
  }
}

function writeResults(results) {
  ensureDataDir();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function resolveMediaId(content) {
  return (
    content.media_id ||
    content.id ||
    content.mediaId ||
    content.job_id ||
    content.jobId ||
    null
  );
}

function resolveStatus(content) {
  if (content.extraction_error || content.error) {
    return 'failed';
  }
  if (content.status === 'error' || content.status === 'failed') {
    return 'failed';
  }
  if (content.status === 'queued' || content.status === 'processing') {
    return content.status;
  }
  return 'completed';
}

async function startWorker() {
  logInfo('worker_starting', { replyQueue: REPLY_QUEUE, rabbitUrl: RABBITMQ_URL });
  let connection;
  
  // Retry logic for connection
  while (!connection) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      logInfo('worker_connected', { replyQueue: REPLY_QUEUE });
      
      connection.on('error', (err) => {
        logError('worker_connection_error', { error: err.message, replyQueue: REPLY_QUEUE });
        process.exit(1);
      });
      
      connection.on('close', () => {
        logError('worker_connection_closed', { replyQueue: REPLY_QUEUE });
        process.exit(1);
      });
      
    } catch (err) {
      logError('worker_connect_retry', { error: err.message, retryInMs: 5000, replyQueue: REPLY_QUEUE });
      await new Promise(res => setTimeout(res, 5000));
    }
  }

  const channel = await connection.createChannel();
  await channel.assertQueue(REPLY_QUEUE, { durable: REPLY_QUEUE_DURABLE });
  logInfo('worker_listening', { replyQueue: REPLY_QUEUE });

  channel.consume(REPLY_QUEUE, (msg) => {
    if (msg !== null) {
      try {
        const content = JSON.parse(msg.content.toString());
        const mediaId = resolveMediaId(content);
        const status = resolveStatus(content);
        logInfo('worker_message_received', {
          mediaId,
          status,
          replyQueue: REPLY_QUEUE,
          hasExtractionError: Boolean(content.extraction_error),
          hasError: Boolean(content.error),
        });

        if (mediaId) {
          const now = new Date().toISOString();
          const results = readResults();
          results[mediaId] = {
            status,
            pipeline: 'real',
            result: content,
            updatedAt: now,
            createdAt: results[mediaId]?.createdAt || now,
          };
          writeResults(results);
          logInfo('worker_result_persisted', { mediaId, status, replyQueue: REPLY_QUEUE });
        } else {
          logError('worker_message_missing_media_id', {
            replyQueue: REPLY_QUEUE,
            payloadKeys: Object.keys(content),
          });
        }

        channel.ack(msg);
      } catch (e) {
        logError('worker_message_processing_failed', { error: e.message, replyQueue: REPLY_QUEUE });
        // Don't requeue bad messages to avoid infinite loops
        channel.nack(msg, false, false);
      }
    }
  });
}

startWorker().catch((error) => {
  logError('worker_fatal', { error: error.message });
});
