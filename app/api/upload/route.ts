import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import amqp from "amqplib";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");
const DEMO_MODE = process.env.DEMO_MODE === "true";
const TARGET_QUEUE = process.env.RABBITMQ_TARGET_QUEUE || "doc-2-md";
const REPLY_QUEUE = process.env.RABBITMQ_REPLY_QUEUE || "demo-responses";
const PUBLISH_TIMEOUT_MS = Number(process.env.RABBITMQ_PUBLISH_TIMEOUT_MS || 10000);

function logInfo(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", scope: "upload-api", event, ...payload }));
}

function logError(event: string, payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", scope: "upload-api", event, ...payload }));
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readResults(): Record<string, any> {
  ensureDataDir();
  if (!fs.existsSync(RESULTS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
  } catch (error) {
    console.error("Error reading results file", error);
    return {};
  }
}

function writeResults(results: Record<string, any>) {
  ensureDataDir();
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

async function sendToRabbitMQ(
  mediaId: string,
  fileUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    logError("rabbit_config_missing", { mediaId, replyQueue: REPLY_QUEUE, targetQueue: TARGET_QUEUE });
    return { ok: false, error: "RABBITMQ_URL is not set" };
  }

  let connection: amqp.ChannelModel | null = null;

  try {
    logInfo("rabbit_publish_started", {
      mediaId,
      rabbitUrl,
      targetQueue: TARGET_QUEUE,
      replyQueue: REPLY_QUEUE,
      fileUrl,
    });
    connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(REPLY_QUEUE, { durable: true });
    await channel.assertQueue(TARGET_QUEUE, { durable: true });

    const message = {
      media_id: mediaId,
      file_url: fileUrl,
      reply_queue: REPLY_QUEUE,
    };

    channel.sendToQueue(TARGET_QUEUE, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    await Promise.race([
      channel.waitForConfirms(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("RabbitMQ confirm timeout")), PUBLISH_TIMEOUT_MS),
      ),
    ]);

    logInfo("rabbit_publish_confirmed", {
      mediaId,
      targetQueue: TARGET_QUEUE,
      replyQueue: REPLY_QUEUE,
    });
    await channel.close();
    await connection.close();
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("rabbit_publish_failed", {
      mediaId,
      error: message,
      targetQueue: TARGET_QUEUE,
      replyQueue: REPLY_QUEUE,
    });
    if (connection) {
      try {
        await connection.close();
      } catch {}
    }
    return { ok: false, error: message };
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const email = formData.get("email") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a safe filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, buffer);
    
    const mediaId = `${DEMO_MODE ? "demo" : "job"}-${timestamp}`;
    
    // Construct the absolute URL for the extractor to download the file
    // If NEXT_PUBLIC_BASE_URL is set, use it. Otherwise, try to derive from request origin.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const fileUrl = `${baseUrl}/uploads/${filename}`;
    
    const now = new Date().toISOString();
    const results = readResults();
    results[mediaId] = {
      status: DEMO_MODE ? "processing" : "queued",
      pipeline: DEMO_MODE ? "demo" : "real",
      updatedAt: now,
      createdAt: now,
    };
    writeResults(results);
    logInfo("job_created", {
      mediaId,
      filename,
      originalFilename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      pipelineMode: DEMO_MODE ? "demo" : "real",
      fileUrl,
      targetQueue: TARGET_QUEUE,
      replyQueue: REPLY_QUEUE,
    });

    let rabbitSuccess = false;
    let rabbitError: string | null = null;

    if (!DEMO_MODE) {
      const publishResult = await sendToRabbitMQ(mediaId, fileUrl);
      rabbitSuccess = publishResult.ok;
      rabbitError = publishResult.error || null;

      if (!publishResult.ok) {
        const failedResults = readResults();
        failedResults[mediaId] = {
          status: "publish_failed",
          pipeline: "real",
          error: rabbitError || "unknown error",
          updatedAt: new Date().toISOString(),
          createdAt: failedResults[mediaId]?.createdAt || now,
        };
        writeResults(failedResults);
        logError("job_marked_publish_failed", {
          mediaId,
          error: rabbitError,
          fileUrl,
        });
      }
    } else {
      logInfo("demo_mode_processing_started", { mediaId, fileUrl });
    }

    // Also log this as a lead if email is provided
    if (email) {
      const DATA_FILE = path.join(DATA_DIR, "leads_data.json");
      const newLead = {
        id: timestamp.toString(),
        email,
        source: DEMO_MODE ? "demo_upload" : "real_upload",
        metadata: {
          filename: file.name,
          savedAs: filename,
          size: file.size,
          type: file.type,
          mediaId: mediaId,
          rabbitMqSent: rabbitSuccess,
          pipelineMode: DEMO_MODE ? "demo" : "real",
          rabbitError,
        },
        createdAt: new Date().toISOString(),
      };

      let leads = [];
      if (fs.existsSync(DATA_FILE)) {
        try {
          const data = fs.readFileSync(DATA_FILE, "utf-8");
          leads = JSON.parse(data);
        } catch(e) {}
      }
      leads.push(newLead);
      fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
    }

    if (!DEMO_MODE && !rabbitSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to enqueue extraction job",
          details: rabbitError,
          mediaId,
          rabbitMqSent: false,
          pipelineMode: "real",
          status: "publish_failed",
        },
        { status: 503 },
      );
    }

    logInfo("job_ready_for_processing", {
      mediaId,
      pipelineMode: DEMO_MODE ? "demo" : "real",
      rabbitMqSent: rabbitSuccess,
      status: DEMO_MODE ? "processing" : "queued",
    });

    return NextResponse.json({ 
      success: true, 
      filename: filename,
      url: fileUrl,
      mediaId: mediaId,
      rabbitMqSent: rabbitSuccess,
      pipelineMode: DEMO_MODE ? "demo" : "real",
      status: DEMO_MODE ? "processing" : "queued",
    });
  } catch (error) {
    logError("upload_request_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
