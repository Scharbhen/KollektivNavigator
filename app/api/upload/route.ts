import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import amqp from "amqplib";
import { processingResults } from "@/lib/store";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

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

    // Start listening for the response if not already listening
    // Note: In a real app, this should be a long-running background worker
    // For this demo, we'll set up a temporary consumer
    channel.consume(replyQueue, (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`Received from RabbitMQ [${replyQueue}]:`, content.id);
          
          if (content.id) {
            processingResults.set(content.id, {
              status: content.extraction_error ? "error" : "completed",
              result: content
            });
          }
          channel.ack(msg);
        } catch (e) {
          console.error("Error parsing RabbitMQ message:", e);
          channel.nack(msg);
        }
      }
    });

    // Don't close connection immediately so the consumer can run
    // connection.close();
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
    
    // Initialize processing status
    processingResults.set(mediaId, { status: "processing" });

    // Try to send to RabbitMQ, but don't fail if it's not configured
    const rabbitSuccess = await sendToRabbitMQ(mediaId, fileUrl);

    // Also log this as a lead if email is provided
    if (email) {
      const DATA_FILE = path.join(process.cwd(), "leads_data.json");
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
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        leads = JSON.parse(data);
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
