import { MessageEvent } from '@shared/types';

export const handler = async (event: any) => {
  for (const record of event.Records) {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    const message: MessageEvent = JSON.parse(payload);
    console.log('Consumer received:', message);
  }
};