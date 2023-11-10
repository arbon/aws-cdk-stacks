/*! MIT License */

import cdk from 'aws-cdk-lib'
import iam from 'aws-cdk-lib/aws-iam'
import logs from 'aws-cdk-lib/aws-logs'

import KmsKeyStack from './kms-key-stack.js'

/**
 * Creates an encrypted CloudWatch log group.
 *
 * Context Parameters
 *
 * - logRetentionDays
 */
export class CloudWatchLogGroupStack extends KmsKeyStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates a CloudWatch Log Group with a KMS key.'

  /**
   * Defines the log retention policy in days.
   * By default, retain data for two years.
   */
  appLogRetentionDays = this.getContextValue('logRetentionDays', logs.RetentionDays.TWO_YEARS)

  /**
   * Creates an encrypted CloudWatch log group. Export ARNs for resources.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Enable KMS key use.

    this.appKey.grantEncryptDecrypt(
      new iam.ServicePrincipal(`logs.${this.region}.amazonaws.com`)
    )

    // Create the log group.

    this.appLogGroup = new logs.LogGroup(this, 'LogGroup', {
      encryptionKey: this.appKey, removalPolicy: this.appRemovalPolicy, retention: this.appLogRetentionDays
    })

    // Export the log group ARN.

    const LOG_GROUP_ARN = 'logGroupArn'

    /* eslint-disable no-new */
    new cdk.CfnOutput(this, LOG_GROUP_ARN, {
      exportName: LOG_GROUP_ARN, value: this.appLogGroup.logGroupArn
    })

    // this.addTags({
    //   'app:aws:log-retention-policy': this.appLogRetentionPolicy
    // })
  }
}

export default CloudWatchLogGroupStack
