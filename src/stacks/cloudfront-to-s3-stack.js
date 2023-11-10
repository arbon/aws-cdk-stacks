/*! MIT License */

import cdk from 'aws-cdk-lib'
import certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import cloudfront from 'aws-cdk-lib/aws-cloudfront'
import iam from 'aws-cdk-lib/aws-iam'
import route53 from 'aws-cdk-lib/aws-route53'
import targets from 'aws-cdk-lib/aws-route53-targets'
import s3 from 'aws-cdk-lib/aws-s3'

import AppStack from './app-stack.js'

/**
 * Defines the root path object to serve.
 */
const DEFAULT_PATH = 'index.html'

/**
 * Defines the prefix for server access logs.
 */
const SERVER_LOGS_PREFIX = 'server'

/**
 * Defines the prefix for Cloudfront logs.
 */
const DISTRIBUTION_LOGS_PREFIX = 'distribution'

/**
 * Implements a stack for creation of a CloudFront distribution.
 *
 */
export class CloudFrontToS3Stack extends AppStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates a distribution, buckets for content and logs, a certificate, etc.'

  /**
   * Defines the default URL path object for the distribution (e.g., index.html).
   */
  appDefaultPath = this.getContextValue('defaultPath', DEFAULT_PATH)

  /**
   * Defines the subdomain for the distribution and certificate (e.g., cname.domain.com).
   */
  appDomainName = this.getContextValue('domainName')

  /**
   * Adds errorConfigurations that redirect to appDefaultPath for single page apps.
   */
  appIsSinglePage = this.getContextValue('isSinglePage', false)

  /**
   * Create a CloudFront distribution to a custom origin.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    if (!this.appDomainName || this.appDomainName.split('.').length !== 3) {
      throw new Error('A subdomain is required (e.g., cname.domain.com).')
    }

    const splitDomain = this.appDomainName.split('.')
    const topLevelDomain = splitDomain.slice(-2).join('.')

    this.appHostedZone = route53.HostedZone.fromLookup(this, 'Zones', {
      domainName: topLevelDomain
    })

    this.appLogsBucket = new s3.Bucket(this, 'Logs', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      removalPolicy: this.appRemovalPolicy
    })

    this.appContentBucket = new s3.Bucket(this, 'Content', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: this.appRemovalPolicy,
      serverAccessLogsBucket: this.appLogsBucket,
      serverAccessLogsPrefix: SERVER_LOGS_PREFIX,
      versioned: true
    })

    this.appCertificate = new certificatemanager.Certificate(this, 'Certificate', {
      domainName: this.appDomainName,
      validation: certificatemanager.CertificateValidation.fromDns(this.appHostedZone)
    })

    // NOTE: Use the older CloudFrontWebDistribution given issues with OAI and OAC and Distribution.
    // See: https://github.com/aws/aws-cdk/issues/21771

    this.appDistribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: this.appContentBucket
        },
        behaviors: [{
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          compress: true,
          isDefaultBehavior: true,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }]
      }],
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(this.appCertificate, {
        aliases: [this.appDomainName],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
      }),
      defaultRootObject: DEFAULT_PATH,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      loggingConfig: {
        bucket: this.appLogsBucket,
        prefix: DISTRIBUTION_LOGS_PREFIX,
        includeCookies: false
      },
      errorConfigurations: this.appIsSinglePage
        ? [
            {
              errorCode: 403,
              responsePagePath: `/${this.appDefaultPath}`,
              responseCode: 200
            },
            {
              errorCode: 404,
              responsePagePath: `/${this.appDefaultPath}`,
              responseCode: 200
            }
          ]
        : []
    })

    this.appAliasRecord = new route53.ARecord(this, 'AliasRecord', {
      recordName: splitDomain[0],
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.appDistribution)),
      zone: this.appHostedZone
    })

    this.appOriginAccessControl = new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        name: `s3-oac-${this.appDomainName}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    })

    // Use addPropertyOverride to fix OAC/OAI and add a managed response headers policy.

    const distribution = this.appDistribution.node.defaultChild

    distribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId',
      this.appOriginAccessControl.attrId)

    // Use managed response headers, cacne and origin request policies.

    distribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.ResponseHeadersPolicyId',
      cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_AND_SECURITY_HEADERS.responseHeadersPolicyId)

    distribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.CachePolicyId',
      cloudfront.CachePolicy.CACHING_OPTIMIZED.cachePolicyId)

    distribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.OriginRequestPolicyId',
      cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN.originRequestPolicyId)

    this.appBucketPolicy = new s3.BucketPolicy(this, 'ContentBucketPolicy', {
      bucket: this.appContentBucket,
      removalPolicy: this.appRemovalPolicy
    })

    this.appBucketPolicy.document.addStatements(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${this.appContentBucket.bucketArn}/*`],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        effect: iam.Effect.ALLOW,
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${this.appDistribution.distributionId}`
          }
        }
      }),
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${this.appContentBucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
        effect: iam.Effect.DENY,
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false'
          }
        }
      })
    )

    /* eslint-disable no-new */
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      exportName: 'DistributionDomainName', value: this.appDistribution.distributionDomainName
    })
  }
}

export default CloudFrontToS3Stack
