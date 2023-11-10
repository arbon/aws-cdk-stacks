/*! MIT License */

import cdk from 'aws-cdk-lib'
import acm from 'aws-cdk-lib/aws-certificatemanager'
import apigateway from 'aws-cdk-lib/aws-apigateway'
import cloudfront from 'aws-cdk-lib/aws-cloudfront'
import cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import iam from 'aws-cdk-lib/aws-iam'
import origins from 'aws-cdk-lib/aws-cloudfront-origins'
import route53 from 'aws-cdk-lib/aws-route53'
import route53targets from 'aws-cdk-lib/aws-route53-targets'
import s3 from 'aws-cdk-lib/aws-s3'

import SnsTopicStack from './sns-topic-stack.js'

class Responses {
  static VERSION = 1

  static BAD_REQUEST_BODY = {
    type: apigateway.ResponseType.BAD_REQUEST_BODY,
    templates: {
      'application/json': '{"status": "Bad Request", "message": "$context.error.validationErrorString"}'
    }
  }

  static DEFAULT_5XX = {
    type: apigateway.ResponseType.DEFAULT_5XX,
    templates: {
      'application/json': '{"status": "Server Error", "message": "$context.error.message"}'
    }
  }

  static INVALID_API_KEY = {
    type: apigateway.ResponseType.INVALID_API_KEY,
    templates: {
      'application/json': '{"status": "Invalid API Key", "message": "$context.error.message"}'
    }
  }
}

/**
 * Creates a Amazon API Gateway with integration to SNS and SQS.
 */
export class ApiGatewayToSnsStack extends SnsTopicStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates an API Gateway with an endpoint to an SNS topic.'

  /**
   * Defines the subdomain for the API (e.g., cname.domain.com).
   */
  appDomainName = this.getContextValue('domainName')

  /**
   * Create an Api Gateway.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    if (!this.appDomainName || this.appDomainName.split('.').length !== 3) {
      throw new Error('A subdomain is required (e.g., events.domain.com).')
    }

    const splitDomain = this.appDomainName.split('.')
    const topLevelDomain = splitDomain.slice(-2).join('.')

    this.appHostedZone = route53.HostedZone.fromLookup(this, 'Zones', {
      domainName: topLevelDomain
    })

    // Create IAM Role for API Gateway

    const apiGatewayRole = new iam.Role(this, 'ApiGatewayRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
    })

    // Give the Role the ability to use the key.

    this.appKey.grantEncryptDecrypt(apiGatewayRole)

    // Allow the Role to publish to the SNS Topic.

    this.appTopic.grantPublish(apiGatewayRole)

    // Create an ACM Certificate for the API's domain name.

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: this.appDomainName,
      validation: acm.CertificateValidation.fromDns(this.appHostedZone)
    })

    const CERTIFICATE_ARN = 'certificateArn'

    /* eslint-disable no-new */
    new cdk.CfnOutput(this, CERTIFICATE_ARN, {
      exportName: CERTIFICATE_ARN, value: certificate.certificateArn
    })

    certificate.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY)

    const logDestination = new apigateway.LogGroupLogDestination(this.appLogGroup)

    // Create API Gateway

    this.appRestApi = new apigateway.RestApi(this, 'RestApi', {
      cloudWatchRole: true,
      disableExecuteApiEndpoint: true,
      deployOptions: {
        accessLogDestination: logDestination,
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields()
      },
      domainName: {
        domainName: this.appDomainName,
        certificate
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      },
      restApiName: 'EventsApi'
    })

    // Create an S3 bucket for logs.

    this.appLogsBucket = new s3.Bucket(this, 'Bucket', {
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.appKey,
      enforceSSL: true,
      lifecycleRules: [{
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(365)
        }]
      }],
      removalPolicy: this.appRemovalPolicy
    })

    // Create a CloudFront distribution for the API.

    this.appDistribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        origin: new origins.HttpOrigin(`${this.appRestApi.restApiId}.execute-api.${this.region}.${this.urlSuffix}`, {
          // originPath: '/prod', // the stage name you've defined
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY
        }),
        originRequestPolicy: new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
          headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('x-api-key')
        }),
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        cachePolicy: new cloudfront.CachePolicy(this, 'CachePolicy', {
          headerBehavior: cloudfront.CacheHeaderBehavior.allowList('x-api-key')
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      enableIpV6: true,
      enableLogging: true,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      logBucket: this.appLogsBucket
    })

    // Create an ALIAS record for the domain.
    new route53.ARecord(this, 'AliasRecord', {
      deleteExisting: true,
      recordName: splitDomain[0],
      zone: this.appHostedZone,
      target: route53.RecordTarget.fromAlias(new route53targets.ApiGateway(this.appRestApi))
    })

    // Create a key for use with the API.

    const apiKey = this.appRestApi.addApiKey('ApiKey')

    this.appRestApi.addUsagePlan('UsagePlan', {
      apiKey,
      apiStages: [{
        api: this.appRestApi, stage: this.appRestApi.deploymentStage
      }],
      quota: {
        limit: 20000, period: apigateway.Period.MONTH
      },
      throttle: {
        rateLimit: 20, burstLimit: 200
      }
    })

    // Create CloudWatch alarms for 4XX and 5XX responses.

    this.appAddAlarms && new cloudwatch.Alarm(this, 'ServerErrorsAlarm', {
      metric: this.appRestApi.metricServerError(),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    })

    this.appAddAlarms && new cloudwatch.Alarm(this, 'ClientErrorsAlarm', {
      metric: this.appRestApi.metricClientError(),
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
    })

    this.appRestApi.addGatewayResponse('BAD_REQUEST_BODY', Responses.BAD_REQUEST_BODY)
    this.appRestApi.addGatewayResponse('DEFAULT_5XX', Responses.DEFAULT_5XX)
    this.appRestApi.addGatewayResponse('INVALID_API_KEY', Responses.INVALID_API_KEY)

    const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
      restApi: this.appRestApi, validateRequestBody: true
    })

    const integration = new apigateway.AwsIntegration({
      service: 'sns',
      action: 'Publish',
      options: {
        credentialsRole: apiGatewayRole,
        integrationResponses: [
          {
            responseTemplates: {
              'application/json': `{
      "message": "OK", topic: "${this.appTopic.topicName}", api: "${this.appRestApi.restApiId}"}`
            },
            statusCode: '200'
          }
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        requestParameters: {
          'integration.request.header.Content-Type': "'application/x-www-form-urlencoded'"
        },
        requestTemplates: {
          'application/json': `Action=Publish&TopicArn=$util.urlEncode('${this.appTopic.topicArn}')&Message=$util.urlEncode($input.body)`
        }
      },
      requestValidator
    })

    const eventsModel = new apigateway.Model(this, 'EventsModel', {
      restApi: this.appRestApi,
      contentType: 'application/json',
      modelName: 'EventsModel',
      schema: {
        schema: apigateway.JsonSchemaVersion.DRAFT4,
        title: 'eventsModel',
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          id: {
            type: apigateway.JsonSchemaType.NUMBER
          },
          name: {
            type: apigateway.JsonSchemaType.STRING
          }
        },
        required: ['id', 'name']
      }
    })

    const resource = this.appRestApi.root.addResource('events')

    resource.addMethod('POST', integration, {
      apiKeyRequired: true,
      requestModels: {
        'application/json': eventsModel
      },
      requestValidator,
      methodResponses: [
        {
          statusCode: '200'
        },
        {
          statusCode: '400'
        }]
    })
  }
}

export default ApiGatewayToSnsStack
