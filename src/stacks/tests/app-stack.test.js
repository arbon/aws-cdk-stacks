import cdk from 'aws-cdk-lib'
import { Template } from 'aws-cdk-lib/assertions'

import AppStack from '../app-stack.js'
import Package from '../../package.js'

describe(AppStack.name, () => {
  test('has package metadata', () => {
    const stack = new AppStack(new cdk.App(), 'Test')
    Template.fromStack(stack).templateMatches({
      Metadata: {
        version: Package.version,
        description: Package.description
      }
    })
  })

  test('has prohibited regions', () => {
    const stack = new AppStack(new cdk.App(), 'Test')
    expect(stack.appProhibtedRegions).toHaveLength(21)
  })

  test('add tags', () => {
    const stack = new AppStack(new cdk.App(), 'Test')

    stack.addTags({
      test: 'test'
    })

    // TODO: Is there a way to find tags in a template?
  })
})
