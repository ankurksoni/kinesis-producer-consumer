import { App, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as ssm from 'aws-cdk-lib/aws-ssm';

class StreamStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const stream = new kinesis.Stream(this, 'KinesisStream', {
      streamName: 'MyStream',
      shardCount: 1,
      removalPolicy: RemovalPolicy.DESTROY
    });

    new ssm.StringParameter(this, 'StreamName', {
      parameterName: '/streams/my-stream/name',
      stringValue: stream.streamName,
      dataType: ssm.ParameterDataType.TEXT
    });

    new ssm.StringParameter(this, 'StreamArn', {
      parameterName: '/streams/my-stream/arn',
      stringValue: stream.streamArn,
      dataType: ssm.ParameterDataType.TEXT
    });
  }
}

const app = new App();
new StreamStack(app, 'StreamStack');