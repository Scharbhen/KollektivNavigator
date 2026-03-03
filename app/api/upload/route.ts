import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import amqp from "amqplib";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");

async function sendToRabbitMQ(mediaId: string, fileUrl: string) {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    console.warn("RABBITMQ_URL not set, skipping RabbitMQ integration");
    return false;
  }

  try {
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();
    
    // Ensure the reply queue exists
    const replyQueue = "demo-responses";
    await channel.assertQueue(replyQueue, { durable: true });
    
    // Ensure the target queue exists
    const targetQueue = "doc-2-md";
    await channel.assertQueue(targetQueue, { durable: true });

    // Send message to extractor
    const message = {
      media_id: mediaId,
      file_url: fileUrl,
      reply_queue: replyQueue
    };

    channel.sendToQueue(targetQueue, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });

    console.log(`Sent to RabbitMQ [${targetQueue}]:`, message);

    // Close connection immediately as we're just publishing
    setTimeout(() => connection.close(), 500);
    return true;
  } catch (error) {
    console.error("RabbitMQ error:", error);
    return false;
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
    
    const mediaId = `demo-${timestamp}`;
    
    // Construct the absolute URL for the extractor to download the file
    // If NEXT_PUBLIC_BASE_URL is set, use it. Otherwise, try to derive from request origin.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const fileUrl = `${baseUrl}/uploads/${filename}`;
    
    // Initialize processing status in results_data.json
    let results: Record<string, any> = {};
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(RESULTS_FILE)) {
      try {
        results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
      } catch (e) {
        console.error("Error reading results file", e);
      }
    }
    results[mediaId] = { status: "processing", updatedAt: new Date().toISOString() };
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Try to send to RabbitMQ, but don't fail if it's not configured
    const rabbitSuccess = await sendToRabbitMQ(mediaId, fileUrl);

    // Also log this as a lead if email is provided
    if (email) {
      const DATA_FILE = path.join(DATA_DIR, "leads_data.json");
      const newLead = {
        id: timestamp.toString(),
        email,
        source: "demo_upload",
        metadata: {
          filename: file.name,
          savedAs: filename,
          size: file.size,
          type: file.type,
          mediaId: mediaId,
          rabbitMqSent: rabbitSuccess
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

    return NextResponse.json({ 
      success: true, 
      filename: filename,
      url: fileUrl,
      mediaId: mediaId,
      rabbitMqSent: rabbitSuccess
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
