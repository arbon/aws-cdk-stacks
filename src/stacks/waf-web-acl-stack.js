/*! MIT License */
/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import wafv2 from 'aws-cdk-lib/aws-wafv2'

import AppStack from './app-stack.js'

/**
 * Implements a web application firewall (WAF) stack.
 *
 * Context Parameters
 *
 * - webAclScope
 */
export class WafWebAclStack extends AppStack {
  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates a web application firewall (WAF) stack.'

  /**
   * Defines the ARN for the ACL.
   */
  static WEB_ACL_ARN = 'webAclArn'

  /**
   * Defines web ACL scope. It may be REGIONAL or CLOUDFRONT.
   */
  appWebAclScope = this.getContextValue('webAclScope', 'REGIONAL')

  /**
   * Creates a web applciation firewall with the AWS baseline core rule set:
   * {@link https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html AWSManagedRulesCommonRuleSet}).
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Validate input parameters.

    if (!['REGIONAL', 'CLOUDFRONT'].includes(this.appWebAclScope)) {
      throw new Error('A web ACL scope is either REGIONAL or CLOUDFRONT.')
    }

    if (this.appAclScope === 'CLOUDFRONT' && this.region !== 'us-east-1') {
      throw new Error('A CloudFront ACL scope requires the us-east-1 region.')
    }

    // Create an basic web ACL resource with the core AWSManagedRulesCommonRuleSet.

    this.appWebAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      defaultAction: {
        allow: {}
      },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 10,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet'
            }
          },
          overrideAction: {
            none: {}
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet'
          }
        }
      ],
      scope: this.appWebAclScope,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WebAclMetric',
        sampledRequestsEnabled: true
      }
    })

    // Associate the ACL and a CloudFront distribution.

    // const association = new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
    //   resourceArn: this.appDistribution.
    //     webAclArn: this.appWebAcl.attrArn,
    // })

    // Export resource ARNs.

    new cdk.CfnOutput(this, WafWebAclStack.WEB_ACL_ARN, {
      exportName: WafWebAclStack.WEB_ACL_ARN, value: this.appWebAcl.attrArn
    })
  }
}

export default WafWebAclStack
