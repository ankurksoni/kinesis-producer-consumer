/**
 * @fileoverview AWS CDK stack for deploying the Kinesis Consumer infrastructure
 * 
 * This module defines the ConsumerStack, which creates:
 * 1. A Lambda function that processes data from the Kinesis stream
 * 2. CloudWatch Logs configuration for monitoring the Lambda
 * 3. IAM roles and policies for secure access to AWS resources
 * 4. Kinesis event source mapping to trigger the Lambda on new records
 * 
 * The stack is designed to integrate with the StreamStack by retrieving
 * the Kinesis stream information from SSM Parameter Store.
 */

import { App, Stack, StackProps, RemovalPolicy, CfnDeletionPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * ConsumerStack creates and configures the Lambda function and related resources
 * for consuming and processing data from the Kinesis stream
 * 
 * This stack:
 * - References the Kinesis stream created by the StreamStack
 * - Creates a Lambda function to process stream data
 * - Sets up CloudWatch logging for observability
 * - Configures IAM permissions for secure resource access
 * - Creates a Kinesis event source to trigger the Lambda on new records
 */
class ConsumerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Retrieve the Kinesis stream ARN from SSM Parameter Store
     * 
     * This approach allows us to reference resources across stacks
     * without creating circular dependencies between the stacks.
     */
    const streamArn = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/arn');

    /**
     * Import the existing Kinesis stream using its ARN
     * 
     * This creates a reference to the stream without creating a new one,
     * allowing us to configure event sources and permissions.
     */
    const stream = kinesis.Stream.fromStreamArn(this, 'ImportedStream', streamArn);

    /**
     * Create a CloudWatch Log Group for the Lambda function
     * 
     * The log group is configured with:
     * - A predictable name matching the Lambda function
     * - A 7-day retention period to manage storage costs
     * - DESTROY removal policy for clean cleanup during development
     */
    const logGroup = new logs.LogGroup(this, 'ConsumerLogGroup', {
      logGroupName: '/aws/lambda/consumer-lambda',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    /**
     * Create the Lambda function for consuming data from Kinesis
     * 
     * The function is configured with:
     * - Node.js 20.x runtime for modern JavaScript features
     * - A handler pointing to the compiled Lambda code
     * - Associated CloudWatch log group for logging
     */
    const consumerFn = new lambda.Function(this, 'ConsumerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      logGroup, // Associate the Lambda with the log group
    });

    /**
     * Apply deletion policy to the Lambda function
     * 
     * This ensures the Lambda function is properly deleted
     * when the stack is destroyed, preventing orphaned resources.
     */
    (consumerFn.node.defaultChild as lambda.CfnFunction).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;

    /**
     * Create a dedicated Log Stream for the Lambda function
     * 
     * This provides a dedicated location for the Lambda's logs,
     * making it easier to monitor and debug the function's execution.
     */
    new logs.LogStream(this, 'ConsumerLogStream', {
      logGroup,
      logStreamName: 'consumer-lambda-stream',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    /**
     * Add explicit CloudWatch Logs permissions to the Lambda's IAM role
     * 
     * These permissions allow the Lambda function to:
     * - Create log groups and streams if they don't exist
     * - Write log events to CloudWatch
     * - List and describe log streams for monitoring
     */
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

    /**
     * Create a Kinesis Event Source for the Lambda function
     * 
     * This configures:
     * - TRIM_HORIZON starting position to process all available records
     * - Batch size of 5 records per Lambda invocation for efficient processing
     * - Automatic permission granting via the event source implementation
     */
    const eventSource = new sources.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
      batchSize: 5,
    });
    
    /**
     * Add the Kinesis event source to the Lambda function
     * 
     * This creates the event source mapping in AWS that triggers
     * the Lambda function when new records arrive in the stream.
     */
    consumerFn.addEventSource(eventSource);

    /**
     * Apply deletion policy to the Lambda's IAM role
     * 
     * This ensures the role is properly deleted when the stack is destroyed,
     * preventing orphaned resources and potential permission issues.
     */
    (consumerFn.role?.node.defaultChild as iam.CfnRole).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;
  }
}

/**
 * Initialize the CDK app and create the ConsumerStack
 */
const app = new App();
new ConsumerStack(app, 'ConsumerStack');