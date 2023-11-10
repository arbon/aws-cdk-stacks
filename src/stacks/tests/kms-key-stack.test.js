import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import KmsKeyStack from '../kms-key-stack.js'

describe(KmsKeyStack.name, () => {
  test('with rotation and default retention', () => {
    const app = new cdk.App()
    const stack = new KmsKeyStack(app, 'Test')
    const template = Template.fromStack(stack)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.hasResource('AWS::KMS::Key', {
      Properties: {
        KeyPolicy: {
          Statement: [{
            Action: 'kms:*',
            Effect: 'Allow',
            Principal: {
              AWS: {
                'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::', { Ref: 'AWS::AccountId' }, ':root']]
              }
            },
            Resource: '*'
          }],
          Version: '2012-10-17'
        },
        EnableKeyRotation: true
      },
      DeletionPolicy: 'Delete',
      UpdateReplacePolicy: 'Delete'
    })
  })

  test('with retention', () => {
    const app = new cdk.App({
      context: {
        removalPolicy: cdk.RemovalPolicy.RETAIN
      }
    })
    const stack = new KmsKeyStack(app, 'Test')
    Template.fromStack(stack).hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain'
    })
  })

  test('without retention', () => {
    const app = new cdk.App({
      context: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      }
    })
    const stack = new KmsKeyStack(app, 'Test')
    Template.fromStack(stack).hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Delete', UpdateReplacePolicy: 'Delete'
    })
  })
})
