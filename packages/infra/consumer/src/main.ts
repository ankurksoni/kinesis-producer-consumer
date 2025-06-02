import { App, Stack, StackProps, RemovalPolicy, CfnDeletionPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

class ConsumerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const streamArn = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/arn');

    const stream = kinesis.Stream.fromStreamArn(this, 'ImportedStream', streamArn);

    // Create log group with 7 days retention
    const logGroup = new logs.LogGroup(this, 'ConsumerLogGroup', {
      logGroupName: '/aws/lambda/consumer-lambda',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const consumerFn = new lambda.Function(this, 'ConsumerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      logGroup, // Associate the Lambda with the log group
    });

    // Apply removal policy to Lambda function
    (consumerFn.node.defaultChild as lambda.CfnFunction).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;

    // Create log stream for the Lambda function
    new logs.LogStream(this, 'ConsumerLogStream', {
      logGroup,
      logStreamName: 'consumer-lambda-stream',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Ensure Lambda has explicit permissions to write to CloudWatch Logs
    consumerFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/consumer-lambda:*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/consumer-lambda:log-stream:*`
      ]
    }));

    // The KinesisEventSource implicitly grants read permissions to the consumer Lambda
    const eventSource = new sources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 5,
    });
    
    consumerFn.addEventSource(eventSource);

    // The event source mapping doesn't have a direct way to set deletion policy
    // Ensure Lambda function and its role will be properly removed
    (consumerFn.role?.node.defaultChild as iam.CfnRole).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;
  }
}

const app = new App();
new ConsumerStack(app, 'ConsumerStack');