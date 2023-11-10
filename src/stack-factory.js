/*! MIT License */

import cdk from 'aws-cdk-lib'
import * as stacks from './stacks/index.js'

const app = new cdk.App()
const id = app.node.tryGetContext('id')
const defaultStack = app.node.tryGetContext('stack')
const defaultEnv = {
  account: app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION
}

const descriptions = {}
const stackImports = Object.entries(stacks)
stackImports.forEach((stack) => {
  descriptions[stack[0]] = stack[1].DESCRIPTION
})

/**
 * Creates CDK stacks.
 */
export class StackFactory {
  /**
   * Exposes stack descriptions.
   */
  static Descriptions = Object.freeze(descriptions)
  /**
   * Creates a CDK Stack class by name.
   * Configuration is derived via application context.
   *
   * @param {string} stackName The class name of the stack to instantiate.
   * @param {object} env Environment settings for the stack.
   * @param {object} properties Properties to pass to the stack.
   * @returns {cdk.Stack} The new CDK stack instance.
   */
  static createStack (stackName = defaultStack, env = defaultEnv, properties) {
    const stackClass = stackImports.find((v) => v[0] === stackName)

    if (!stackName || !stackClass) {
      console.error('\nA valid stack name is required. Please try:\n')
      stackImports.forEach((stack, value) => {
        console.error('%s. \x1b[36m%s\x1b[0m - %s',
          String(value + 1).padStart(3, ' '), stack[0], stack[1].DESCRIPTION)
      })
      return
    }

    // Instantiate the desired Stack from our collection.
    return new stackClass[1](app, id, {
      ...{
        description: stackClass[1].DESCRIPTION,
        env
      },
      ...properties
    })
  }
}

export default StackFactory
