/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import SnsTopicStack from '../sns-topic-stack.js'

describe(SnsTopicStack.name, () => {
  test('synthesizes', () => {
    const app = new cdk.App()
    const stack = new SnsTopicStack(app, 'Test')
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 0)
    template.resourceCountIs('AWS::IAM::Policy', 0)
    template.resourceCountIs('AWS::IAM::Role', 0)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })

  test('with alarms', () => {
    const app = new cdk.App({
      context: {
        addAlarms: true
      }
    })
    const stack = new SnsTopicStack(app, 'Test')
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2)
    template.resourceCountIs('AWS::IAM::Policy', 0)
    template.resourceCountIs('AWS::IAM::Role', 0)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })

  test('with email subscription', () => {
    const app = new cdk.App({
      context: {
        emailSubscription: 'test@test.com'
      }
    })

    const stack = new SnsTopicStack(app, 'Test')
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 0)
    template.resourceCountIs('AWS::IAM::Policy', 0)
    template.resourceCountIs('AWS::IAM::Role', 0)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 2)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })

  test('with alarms', () => {
    const app = new cdk.App({
      context: {
        addAlarms: true
      }
    })

    const stack = new SnsTopicStack(app, 'Test')
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 2)
    template.resourceCountIs('AWS::IAM::Policy', 0)
    template.resourceCountIs('AWS::IAM::Role', 0)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })
})
