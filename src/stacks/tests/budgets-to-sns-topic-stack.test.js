/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import BudgetsToSnsTopicStack from '../budgets-to-sns-topic-stack.js'

describe(BudgetsToSnsTopicStack.name, () => {
  test('with no limit', () => {
    const app = new cdk.App()
    expect(() => {
      new BudgetsToSnsTopicStack(app, 'Test')
    }).toThrow(Error)
  })

  test('with invalid limit', () => {
    const app = new cdk.App({
      context: {
        budgetsLimit: 0
      }
    })
    expect(() => {
      new BudgetsToSnsTopicStack(app, 'Test')
    }).toThrow(Error)
  })

  test('with invalid cost', () => {
    const app = new cdk.App({
      context: {
        budgetsLimit: 100,
        budgetsType: 'INVALID'
      }
    })
    expect(() => {
      new BudgetsToSnsTopicStack(app, 'Test')
    }).toThrow(Error)
  })

  test('with invalid period', () => {
    const app = new cdk.App({
      context: {
        budgetsLimit: 100,
        budgetsPeriod: 'INVALID'
      }
    })
    expect(() => {
      new BudgetsToSnsTopicStack(app, 'Test')
    }).toThrow(Error)
  })

  test('with valid budget limit', () => {
    const app = new cdk.App({
      context: {
        budgetsLimit: 100
      }
    })

    const stack = new BudgetsToSnsTopicStack(app, 'Test')
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::IAM::Role', 1)
    template.resourceCountIs('AWS::IAM::Policy', 1)
    template.resourceCountIs('AWS::Budgets::Budget', 1)
  })
})
