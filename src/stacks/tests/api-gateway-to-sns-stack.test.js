/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import ApiGatewayToSnsStack from '../api-gateway-to-sns-stack.js'

const env = {
  account: 'XXXXXXXXXXXX', region: 'us-east-1'
}

describe(ApiGatewayToSnsStack.name, () => {
  test('with no domain name', () => {
    const app = new cdk.App()
    expect(() => {
      new ApiGatewayToSnsStack(app, 'Test')
    }).toThrow(Error)
  })

  test('with an invalid domain name', () => {
    const app = new cdk.App({
      context: {
        domainName: 'test.com'
      }
    })
    expect(() => {
      new ApiGatewayToSnsStack(app, 'Test')
    }).toThrow(Error)
  })

  test('synthesizes', () => {
    const app = new cdk.App({
      context: {
        domainName: 'events.test.com'
      }
    })
    const stack = new ApiGatewayToSnsStack(app, 'Test', {
      env
    })
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 0)
    template.resourceCountIs('AWS::IAM::Policy', 1)
    template.resourceCountIs('AWS::IAM::Role', 4)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })

  test('with alarms', () => {
    const app = new cdk.App({
      context: {
        addAlarms: true,
        domainName: 'events.test.com'
      }
    })
    const stack = new ApiGatewayToSnsStack(app, 'Test', {
      env
    })
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 4)
    template.resourceCountIs('AWS::IAM::Policy', 1)
    template.resourceCountIs('AWS::IAM::Role', 4)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 1)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })

  test('with email subscription', () => {
    const app = new cdk.App({
      context: {
        emailSubscription: 'test@test.com',
        domainName: 'events.test.com'
      }
    })

    const stack = new ApiGatewayToSnsStack(app, 'Test', {
      env
    })
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CloudWatch::Alarm', 0)
    template.resourceCountIs('AWS::IAM::Policy', 1)
    template.resourceCountIs('AWS::IAM::Role', 4)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.resourceCountIs('AWS::SNS::Subscription', 2)
    template.resourceCountIs('AWS::SNS::Topic', 1)
    template.resourceCountIs('AWS::SQS::Queue', 2)
  })
})
