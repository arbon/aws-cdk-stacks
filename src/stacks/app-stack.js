/*! MIT License */
/* eslint-disable */

import cdk from 'aws-cdk-lib'
import Package from '../package.js'

/*
 * TODO: Consider a non-static approach whereby a list is pulled
 * via AWS SSM as a function of service availability, team/company policy, etc.
 *
 * aws ssm get-parameters-by-path \
 * --path /aws/service/global-infrastructure/regions \
 * --query 'Parameters[].Value'
 *
 * aws ssm get-parameters-by-path \
 * --path /aws/service/global-infrastructure/services/apigateway/regions \
 * --query 'Parameters[].Value'
 */
const PROHIBITED_REGIONS = Object.freeze([
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-northeast-3',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-south-1',
  'eu-west-3',
  'eu-north-1',
  'me-south-1',
  'sa-east-1'
])

/**
 * Implements a low-level stack for resource creation.
 * Provides region checking, a global removal policy for resources, creation of CloudWatch Alarms,
 * and tagging for resources.
 *
 * Context Parameters
 *
 * - addAlarms
 * - removalPolicy
*/
export class AppStack extends cdk.Stack {
  /**
   * Defines whether or not alarms will be created for resources.
   */
  appAddAlarms = this.getContextValue('addAlarms', false)

  /**
   * Defines a base resource removal policy.
   */
  appRemovalPolicy = this.getContextValue('removalPolicy', cdk.RemovalPolicy.DESTROY)

  /**
   * Exposes package data.
   */
  package = Package

  /**
   * Adds metadata based on package.json.
   * Sets a removal policy for resources.
   * Determines whether Cloudwatch alarms should be created for resources.
   *
   * @param {object} scope The parent of this stack.
   * @param {string} id The construct ID of this stack.
   * @param {object} props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Add package metadata to the template.

    this.addMetadata('version', this.package.version)
    this.addMetadata('description', this.package.description)

    // Tag resources.

    this.addTags({
      // 'app:environment': this.environment,
      'app:package-author': this.package.author,
      'app:package-version': this.package.version,
      'app:removal-policy': this.appRemovalPolicy
    })

    // AppPackage.contributors.forEach((contributor) => {
    //   cdk.Tags.of(this).add('package:contributor', `${contributor.name} ${contributor.email}`)
    // })
  }

  /**
   * Gets prohibited regions. Allow subclasses to override the list.
   * @returns The array of regions.
   */
  get appProhibtedRegions () {
    return PROHIBITED_REGIONS
  }

  /**
   * Tag this resource based on object key-value pairs.
   * @param {object} tags An object containing properties used to set tags.
   */
  addTags (tags = {}) {
    for (const [key, value] of Object.entries(tags)) {
      cdk.Tags.of(this).add(key, value)
    }
  }

  /**
   * Gets a value for the key from the current context, potentially returning a default value.
   *
   * @param key The context key to try.
   * @param defaultValue The default value.
   * @returns The value for the key or default value, undefined.
   */
  getContextValue (key, defaultValue) {
    return this.node.tryGetContext(key) || defaultValue
  }
}

export default AppStack
