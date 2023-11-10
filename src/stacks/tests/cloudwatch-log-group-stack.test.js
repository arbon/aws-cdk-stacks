import cdk from 'aws-cdk-lib'
import logs from 'aws-cdk-lib/aws-logs'
import { Template, Match } from 'aws-cdk-lib/assertions'

import CloudWatchLogGroupStack from '../cloudwatch-log-group-stack.js'

describe(CloudWatchLogGroupStack.name, () => {
  test('synthesizes', () => {
    const app = new cdk.App({
      context: {
        removalPolicy: cdk.RemovalPolicy.DESTROY
      }
    })
    const stack = new CloudWatchLogGroupStack(app, 'Test')
    const template = Template.fromStack(stack)
    template.resourceCountIs('AWS::KMS::Key', 1)
    template.resourceCountIs('AWS::Logs::LogGroup', 1)
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: logs.RetentionDays.TWO_YEARS,
      KmsKeyId: {
        'Fn::GetAtt': [Match.stringLikeRegexp('Key'), 'Arn']
      }
    })
  })
})
