/**
 * @fileoverview Kinesis Producer Lambda Function
 * 
 * This Lambda function serves as a data producer for the Kinesis stream.
 * It generates sample events and sends them to the configured Kinesis stream.
 * The function is designed to be triggered on a schedule via EventBridge rules.
 */

import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { MessageEvent } from '@shared/types';

/**
 * Initialize the Kinesis client with default configuration
 * 
 * The client will use the AWS credentials from the Lambda execution role
 * and automatically determine the region from the Lambda environment.
 */
const client = new KinesisClient({});

/**
 * Lambda handler function that generates and sends data to the Kinesis stream
 * 
 * This function:
 * 1. Creates a sample MessageEvent with the current timestamp
 * 2. Serializes the event to JSON
 * 3. Sends the data to Kinesis using the PutRecord API
 * 4. Logs the sent event for monitoring and debugging
 * 
 * @async
 * @returns {Promise<void>} A Promise that resolves when the record is successfully sent
 * @throws Will throw an error if the Kinesis operation fails
 */
export const handler = async (): Promise<void> => {
  // Create a sample event with the current timestamp
  const event: MessageEvent = {
    message: 'Hello',
    time: Date.now(),
  };

  // Send the event to the Kinesis stream
  // The stream name is provided via environment variables
  // The partition key determines which shard will process the record
  await client.send(new PutRecordCommand({
    StreamName: process.env.STREAM_NAME!, // Non-null assertion as this env var is required
    PartitionKey: 'key-1',               // Using a fixed partition key for simplicity
    Data: Buffer.from(JSON.stringify(event)), // Convert event to JSON string then to Buffer
  }));

  // Log the sent event for monitoring
  console.log('Producer sent:', event);
};