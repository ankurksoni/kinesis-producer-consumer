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

class ProducerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const streamName = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/name');

    // Create log group with 7 days retention
    const logGroup = new logs.LogGroup(this, 'ProducerLogGroup', {
      logGroupName: '/aws/lambda/producer-lambda',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const producerFn = new lambda.Function(this, 'ProducerLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      environment: {
        STREAM_NAME: streamName,
      },
      logGroup, // Associate the Lambda with the log group
    });

    // Apply removal policy to Lambda function
    (producerFn.node.defaultChild as lambda.CfnFunction).cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;

    // Create log stream for the Lambda function
    new logs.LogStream(this, 'ProducerLogStream', {
      logGroup,
      logStreamName: 'producer-lambda-stream',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Ensure Lambda has explicit permissions to write to CloudWatch Logs
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

    // Explicitly grant permissions to put records to Kinesis
    const streamArn = ssm.StringParameter.valueForStringParameter(this, '/streams/my-stream/arn');
    const stream = kinesis.Stream.fromStreamArn(this, 'ImportedStream', streamArn);
    stream.grantWrite(producerFn);

    // Create EventBridge rule with RemovalPolicy
    const rule = new events.Rule(this, 'ScheduleProducer', {
      schedule: events.Schedule.rate(Duration.minutes(5)),
      targets: [new targets.LambdaFunction(producerFn)],
    });
    
    // Apply RemovalPolicy.DESTROY to the rule's underlying CloudFormation resource
    const cfnRule = rule.node.defaultChild as events.CfnRule;
    cfnRule.cfnOptions.deletionPolicy = CfnDeletionPolicy.DELETE;
  }
}

const app = new App();
new ProducerStack(app, 'ProducerStack');