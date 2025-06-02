/**
 * @fileoverview Kinesis Consumer Lambda Function
 * 
 * This Lambda function serves as a data consumer for the Kinesis stream.
 * It processes incoming records from the stream, decodes the base64-encoded data,
 * and performs actions on each message event.
 * 
 * The function is automatically triggered by AWS Lambda when new records
 * are available in the Kinesis stream.
 */

import { MessageEvent } from '@shared/types';

/**
 * Lambda handler function for processing Kinesis stream records
 * 
 * When Kinesis triggers this Lambda function, it passes an event object containing:
 * - Records: An array of Kinesis records, each with encoded data
 * 
 * This function:
 * 1. Iterates through each record in the batch
 * 2. Decodes the base64-encoded data to UTF-8 string
 * 3. Parses the JSON string into a MessageEvent object
 * 4. Processes each event (currently just logs it)
 * 
 * @async
 * @param {Object} event - The event from Kinesis trigger containing records
 * @param {Array} event.Records - Array of Kinesis records
 * @param {Object} event.Records[].kinesis - Kinesis data within each record
 * @param {string} event.Records[].kinesis.data - Base64-encoded event data
 * @returns {Promise<void>} A Promise that resolves when all records are processed
 * @throws Will throw an error if record processing fails
 */
export const handler = async (event: any): Promise<void> => {
  // Process each record in the batch received from Kinesis
  for (const record of event.Records) {
    // Decode the base64-encoded data to a UTF-8 string
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    
    // Parse the JSON string into a MessageEvent object
    const message: MessageEvent = JSON.parse(payload);
    
    // Process the message (in this example, just logging it)
    // In a real application, you would add business logic here
    console.log('Consumer received:', message);
  }
};