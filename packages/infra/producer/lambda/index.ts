import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { MessageEvent } from '@shared/types';

const client = new KinesisClient({});

export const handler = async () => {
  const event: MessageEvent = {
    message: 'Hello',
    time: Date.now(),
  };

  await client.send(new PutRecordCommand({
    StreamName: process.env.STREAM_NAME!,
    PartitionKey: 'key-1',
    Data: Buffer.from(JSON.stringify(event)),
  }));

  console.log('Producer sent:', event);
};