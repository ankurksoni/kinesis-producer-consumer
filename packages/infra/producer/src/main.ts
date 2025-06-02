/**
 * @fileoverview AWS CDK stack for deploying the Kinesis Producer infrastructure
 * 
 * This module defines the ProducerStack, which creates:
 * 1. A Lambda function that generates and sends data to the Kinesis stream
 * 2. CloudWatch Logs configuration for monitoring the Lambda
 * 3. IAM roles and policies for secure access to AWS resources
 * 4. EventBridge rule to schedule the Lambda function execution
 * 
 * The stack is designed to integrate with the StreamStack by retrieving
 * the Kinesis stream information from SSM Parameter Store.
 */

import { App, Stack, StackProps, Duration, RemovalPolicy, CfnDeletionPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

/**
 * ProducerStack creates and configures the Lambda function and related resources
 * for producing data to the Kinesis stream
 * 
 * This stack:
 * - References the Kinesis stream created by the StreamStack
 * - Creates a Lambda function to generate and send data
 * - Sets up CloudWatch logging for observability
 * - Configures IAM permissions for secure resource access
 * - Creates an EventBridge rule to schedule the Lambda execution
 */
class ProducerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Retrieve the Kinesis stream name from SSM Parameter Store
     * 
     * This approach allows us to reference resources across stacks
     * without creating circular dependencies between the stacks.
     */
    const streamName = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/name');

    /**
     * Create a CloudWatch Log Group for the Lambda function
     * 
     * The log group is configured with:
     * - A predictable name matching the Lambda function
     * - A 7-day retention period to manage storage costs
     * - DESTROY removal policy for clean cleanup during development
     */
    const logGroup = new logs.LogGroup(this, 'ProducerLogGroup', {
      logGroupName: '/aws/lambda/producer-lambda',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    /**
     * Create the Lambda function for producing data to Kinesis
     * 
     * The function is configured with:
     * - Node.js 20.x runtime for modern JavaScript features
     * - A handler pointing to the compiled Lambda code
     * - Environment variables for configuration
     * - Associated CloudWatch log group for logging
     */
    const producerFn = new lambda.Function(this, 'ProducerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      environment: {
        STREAM_NAME: streamName, // Pass the stream name to the Lambda
      },
      logGroup, // Associate the Lambda with the log group
    });

    /**
     * Apply deletion policy to the Lambda function
     * 
     * This ensures the Lambda function is properly deleted
     * when the stack is destroyed, preventing orphaned resources.
     */
    (producerFn.node.defaultChild as lambda.CfnFunction).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;

    /**
     * Create a dedicated Log Stream for the Lambda function
     * 
     * This provides a dedicated location for the Lambda's logs,
     * making it easier to monitor and debug the function's execution.
     */
    new logs.LogStream(this, 'ProducerLogStream', {
      logGroup,
      logStreamName: 'producer-lambda-stream',
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
    producerFn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/producer-lambda:*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/producer-lambda:log-stream:*`
      ]
    }));

    /**
     * Grant the Lambda function permissions to write to the Kinesis stream
     * 
     * 1. Retrieve the stream ARN from SSM Parameter Store
     * 2. Import the stream as a reference
     * 3. Grant the Lambda write permissions to the stream
     */
    const streamArn = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/arn');
    const stream = kinesis.Stream.fromStreamArn(this, 'ImportedStream', streamArn);
    stream.grantWrite(producerFn);

    /**
     * Create an EventBridge rule to schedule the Lambda function
     * 
     * The rule is configured to:
     * - Run every 5 minutes
     * - Target the producer Lambda function
     * - Be deleted when the stack is destroyed
     */
    const rule = new events.Rule(this, 'ScheduleProducer', {
      schedule: events.Schedule.rate(Duration.minutes(5)),
      targets: [new targets.LambdaFunction(producerFn)],
    });
    
    /**
     * Apply removal policy to the EventBridge rule
     * 
     * This ensures the rule is properly deleted when the stack is destroyed,
     * preventing orphaned resources and ongoing invocations.
     */
    const cfnRule = rule.node.defaultChild as events.CfnRule;
    cfnRule.cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;
  }
}

/**
 * Initialize the CDK app and create the ProducerStack
 */
const app = new App();
new ProducerStack(app, 'ProducerStack');