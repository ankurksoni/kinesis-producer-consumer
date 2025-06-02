/**
 * @fileoverview AWS CDK stack for deploying a Kinesis Data Stream and related resources
 * 
 * This module defines the StreamStack, which creates:
 * 1. A Kinesis Data Stream to serve as the backbone for data flow
 * 2. SSM parameters to store the stream name and ARN for reference by other stacks
 * 
 * The stack follows infrastructure-as-code best practices, with each resource
 * properly defined and configured for easy deployment and maintenance.
 */

import { App, Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/**
 * StreamStack creates and configures the Kinesis Data Stream infrastructure
 * 
 * This stack represents the foundation of the streaming data pipeline, establishing
 * the Kinesis stream that will be used by both producer and consumer components.
 * It also stores key stream properties in SSM Parameter Store for cross-stack referencing.
 */
class StreamStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /**
     * Create a Kinesis Data Stream with 1 shard
     * 
     * The stream is configured with:
     * - A fixed name for predictability
     * - A single shard (can be increased for higher throughput)
     * - DESTROY removal policy for easy cleanup during development
     */
    const stream = new kinesis.Stream(this, 'KinesisStream', {
      streamName: 'MyStream',
      shardCount: 1,
      removalPolicy: RemovalPolicy.DESTROY
    });

    /**
     * Store the stream name in SSM Parameter Store
     * 
     * This parameter allows other stacks (like the producer) to reference
     * the stream by name without creating circular dependencies
     */
    new ssm.StringParameter(this, 'StreamName', {
      parameterName: '/streams/my-stream/name',
      stringValue: stream.streamName,
      dataType: ssm.ParameterDataType.TEXT
    });

    /**
     * Store the stream ARN in SSM Parameter Store
     * 
     * This parameter allows other stacks (like the consumer) to reference
     * the stream by ARN without creating circular dependencies
     */
    new ssm.StringParameter(this, 'StreamArn', {
      parameterName: '/streams/my-stream/arn',
      stringValue: stream.streamArn,
      dataType: ssm.ParameterDataType.TEXT
    });
  }
}

// Create and initialize the CDK app and the StreamStack
const app = new App();
new StreamStack(app, 'StreamStack');