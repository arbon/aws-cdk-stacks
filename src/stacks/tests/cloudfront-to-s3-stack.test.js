/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import CloudFrontToS3Stack from '../cloudfront-to-s3-stack.js'

const env = {
  account: '020260563340', region: 'us-east-1'
}

describe(CloudFrontToS3Stack.name, () => {
  test('with no domain name', () => {
    const app = new cdk.App()
    expect(() => {
      new CloudFrontToS3Stack(app, 'Test')
    }).toThrow(Error)
  })

  test('with an invalid domain name', () => {
    const app = new cdk.App({
      context: {
        domainName: 'test.com'
      }
    })
    expect(() => {
      new CloudFrontToS3Stack(app, 'Test')
    }).toThrow(Error)
  })

  test('synthesizes', () => {
    const app = new cdk.App({
      context: {
        domainName: 'cdn.test.com'
      }
    })
    const stack = new CloudFrontToS3Stack(app, 'Test', {
      env
    })
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CertificateManager::Certificate', 1)
    template.resourceCountIs('AWS::CloudFront::Distribution', 1)
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1)
    template.resourceCountIs('AWS::Route53::RecordSet', 1)
    template.resourceCountIs('AWS::S3::Bucket', 2)
    template.resourceCountIs('AWS::S3::BucketPolicy', 3)
  })

  test('with spa error configurations', () => {
    const app = new cdk.App({
      context: {
        domainName: 'cdn.test.com',
        isSinglePage: true
      }
    })
    const stack = new CloudFrontToS3Stack(app, 'Test', {
      env
    })
    const template = Template.fromStack(stack)

    template.resourceCountIs('AWS::CertificateManager::Certificate', 1)
    template.resourceCountIs('AWS::CloudFront::Distribution', 1)
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1)
    template.resourceCountIs('AWS::Route53::RecordSet', 1)
    template.resourceCountIs('AWS::S3::Bucket', 2)
    template.resourceCountIs('AWS::S3::BucketPolicy', 3)
  })
})
