/*! MIT License */
/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import kms from 'aws-cdk-lib/aws-kms'

import AppStack from './app-stack.js'

/**
 * Implements a stack for KMS key creation.
 *
 * Context Parameters
 *
 * - keyAlias
*/
export class KmsKeyStack extends AppStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates a rotating KMS key with the desired removal policy.'

  /**
   * Defines a key alias.
   */
  appKeyAlias = this.getContextValue('keyAlias')

  /**
   * Create a KMS key for ecryption of resources.
   * Export ARNs for resources.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Create the KMS key.

    this.appKey = new kms.Key(this, 'Key', {
      enableKeyRotation: true, removalPolicy: this.appRemovalPolicy, alias: this.appKeyAlias
    })

    // Export the key ARN.

    const KEY_ARN = 'keyArn'

    new cdk.CfnOutput(this, KEY_ARN, {
      exportName: KEY_ARN, value: this.appKey.keyArn
    })
  }
}

export default KmsKeyStack
