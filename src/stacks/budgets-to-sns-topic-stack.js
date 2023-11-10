/*! MIT License */
/* eslint-disable no-new */

import cdk from 'aws-cdk-lib'
import budgets from 'aws-cdk-lib/aws-budgets'
import iam from 'aws-cdk-lib/aws-iam'

import SnsTopicStack from './sns-topic-stack.js'

/**
* Defines parameters for context parameters. These include
 * budget parameters for currency, limit, period and type.
 */
const parameters = Object.freeze({
  CURRENCY: 'budgetsCurrency',
  LIMIT: 'budgetsLimit',
  PERIOD: 'budgetsPeriod',
  TYPE: 'budgetsType'
})

/**
 * Creates a budget stack with an SNS subscription at 80 and 100% of the desired budget limit.
 * Budget features are set via context keys.
 */
export class BudgetsToSnsTopicStack extends SnsTopicStack {
  /**
   * Expose context parameters.
   */
  static Params = parameters

  /**
   * Provides a description of stack resources.
   */
  static DESCRIPTION = 'Creates a Budget with an SNS Topic subscription.'

  /**
   * Defines the currency for the budget.
   * TODO: Validate?
   */
  appBudgetsCurrency = this.getContextValue(parameters.CURRENCY, 'USD')

  /**
   * Defines the numeric budget limit.
   * This is a nonzero number (e.g., 1000).
   */
  appBudgetsLimit = Number(this.getContextValue(parameters.LIMIT))

  /**
   * Defines the budget period. These options include:
   *
   * - MONTHLY
   * - QUARTERLY
   * - ANNUALLY
   */
  appBudgetsPeriod = this.getContextValue(parameters.PERIOD, 'MONTHLY')

  /**
   * Defines the budget type. Options include: COST or USAGE.
   */
  appBudgetsType = this.getContextValue(parameters.TYPE, 'COST')

  /**
   * Create a budget, an SNS topic, and IAM role for SNS publication.
   *
   * @param scope The parent of this stack.
   * @param id The construct ID of this stack.
   * @param props Stack properties.
   */
  constructor (scope, id, props) {
    super(scope, id, props)

    // Validate input parameters.

    if (isNaN(this.appBudgetsLimit) || this.appBudgetsLimit < 0) {
      throw new Error(`A numeric, nonzero "${parameters.LIMIT}" is required.`)
    }

    if (!['MONTHLY', 'QUARTERLY', 'ANNUALLY'].includes(this.appBudgetsPeriod)) {
      throw new Error(`A "${parameters.PERIOD}" is: MONTHLY, QUARTERLY, or ANNUALLY.`)
    }

    if (!['COST', 'USAGE'].includes(this.appBudgetsType)) {
      throw new Error(`A "${parameters.TYPE}" is COST or USAGE.`)
    }

    // Create IAM role for budget publishing to SNS.

    this.appBudgetsRole = new iam.Role(this, 'BudgetsRole', {
      assumedBy: new iam.ServicePrincipal('budgets.amazonaws.com')
    })

    // Allow the role to publish to the SNS topic.

    this.appTopic.grantPublish(this.appBudgetsRole)

    // Create a budget. Add SNS subscribers; one at 100% and another at 80%.
    // TODO: Add subscribers/threshold via context? Support forecasted?

    this.appCostBudget = new budgets.CfnBudget(this, 'CostBudget', {
      budget: {
        budgetLimit: {
          amount: this.appBudgetsLimit,
          unit: this.appBudgetsCurrency
        },
        budgetType: this.appBudgetsType,
        timeUnit: this.appBudgetsPeriod
      },
      notificationsWithSubscribers: [
        {
          notification: {
            threshold: 100,
            thresholdType: 'PERCENTAGE',
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN'
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.appTopic.topicArn
            }
          ]
        },
        {
          notification: {
            threshold: 80,
            thresholdType: 'PERCENTAGE',
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN'
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.appTopic.topicArn
            }
          ]
        }
      ]
    })

    // Export the budgets role ARN.

    const BUDGETS_ROLE_ARN = 'budgetsRoleArn'

    new cdk.CfnOutput(this, BUDGETS_ROLE_ARN, {
      exportName: BUDGETS_ROLE_ARN, value: this.appBudgetsRole.roleArn
    })
  }
}

export default BudgetsToSnsTopicStack
