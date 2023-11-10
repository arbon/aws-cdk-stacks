/*! MIT License */

import cdk from 'aws-cdk-lib'
import cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import sns from 'aws-cdk-lib/aws-sns'
import sqs from 'aws-cdk-lib/aws-sqs'
import subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'

import CloudWatchLogGroupStack from './cloudwatch-log-group-stack.js'

/**
 * Implements a stack for SNS topic to SQS queue propagatin using the "fan out" approach.
 *
 * Context Parameters
 *
 * - appAddQueues
 * - appEmailSubscription
 */
export class SnsTopicStack extends CloudWatchLogGroupStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates an SNS Topic. Optionally, add subscribed SQS queues and associated dead-letter queues.'

  /**
   * SQS queues that have been created.
   */
  appQueues = []

  /**
   * Dead-letter SQS queues that have been created.
   */
  appDeadLetterQueues = []

  /**
   * Supports SQS queue creation. By default, one set of queues are created.
   */
  appAddQueues = this.getContextValue('addQueues', 1)

  /**
   * Supports email address topic subscription.
   */
  appEmailSubscription = this.getContextValue('emailSubscription')

  /**
   * Create an SNS topic.
   * Add a Cloudwatch metric alarm for the number of messages that SNS failed to deliver.
   * Create SQS queues, subscribe queues to the SNS topic.
   * Optionally, create metric alarms when messages are available fron dead-letter queues.
   * Export ARNs for resources.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Create the topic.

    this.appTopic = new sns.Topic(this, 'Topic', {
      masterKey: this.appKey
    })

    // Export the topic ARN.

    const TOPIC_ARN = 'topicArn'

    /* eslint-disable no-new */
    new cdk.CfnOutput(this, TOPIC_ARN, {
      exportName: TOPIC_ARN, value: this.appTopic.topicArn
    })

    // Add a Cloudwatch metric alarm for delivery failures.

    this.appAddAlarms && new cloudwatch.Alarm(this, 'NotificationFailures', {
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      datapointsToAlarm: 1,
      evaluationPeriods: 1,
      metric: this.appTopic.metricNumberOfNotificationsFailed(),
      threshold: 1
    })

    // Optionally, add an email subscription.

    this.appEmailSubscription &&
      this.appTopic.addSubscription(new subscriptions.EmailSubscription(this.appEmailSubscription))

    // Optionally, create SQS queues, dead-letter queues, and topic subscriptions.

    while (this.appAddQueues--) {
      const deadLetterQueue = new sqs.Queue(this, `DeadLetterQueue${this.appQueues.length}`, {
        retentionPeriod: cdk.Duration.days(14),
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: this.appKey
      })

      const queue = new sqs.Queue(this, `Queue${this.appQueues.length}`, {
        deadLetterQueue: {
          maxReceiveCount: 5, queue: deadLetterQueue
        },
        encryption: sqs.QueueEncryption.KMS,
        encryptionMasterKey: this.appKey
      })

      this.appTopic.addSubscription(new subscriptions.SqsSubscription(queue))

      // Add an alarm for messages in the dead-letter queue.

      this.appAddAlarms && new cloudwatch.Alarm(this, `DeadLetterQueue${this.appQueues.length}Alarm`, {
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        datapointsToAlarm: 1,
        evaluationPeriods: 1,
        metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
        threshold: 1
      })

      this.appQueues.push(queue)
      this.appDeadLetterQueues.push(deadLetterQueue)
    }

    Object.freeze(this.appDeadLetterQueues)
    Object.freeze(this.appQueues)
  }
}

export default SnsTopicStack
