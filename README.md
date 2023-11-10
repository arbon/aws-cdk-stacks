# AWS Cloud Development Kit Stacks

[![Unit Tests](https://github.com/arbon/aws-cdk-stacks/actions/workflows/run-unit-tests.yaml/badge.svg)](https://github.com/arbon/aws-cdk-stacks/actions/workflows/run-unit-tests.yaml)

This is an [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/) project written in JavaScript to define AWS infrastructure. It defines a number of _stacks_ used to create and deploy resources ([S3 Buckets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket.html), [SNS Topics](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sns-topic.html), etc.) via [AWS CloudFormation Templates](https://aws.amazon.com/cloudformation/resources/templates/).

The CDK provides a command-line tool called the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) that generates or "synthesizes" templates from CDK code and deployes them to an account and region.

The intent is to accumulate a handful of useful "recipes" for reference. For additional details, please see:

- [AWS Cloud Development Kit / Getting Started](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
- [AWS Cloud Development Kit / Stacks](https://docs.aws.amazon.com/cdk/v2/guide/stacks.html)

## Installation

[Node Package Manager (NPM)](https://www.npmjs.com) is used to install package dependencies like the [`aws-cdk`](https://www.npmjs.com/package/aws-cdk).

```bash
npm install
```

## Organization

The basic deployment unit for the CDK is called a _stack_ and is implemented via the [`Stack`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html) construct. This project contains a number of `Stack` implementations in `src/stacks`; these are derived from a base `AppStack` class that implement shared features (like alarms, or removal policy). Some of these subclasses include:

1. `ApiGatewayToSnsStack` - Creates an API Gateway with an endpoint to an SNS topic.
2. `AppStack` - Implements a common, base app stack with resource tagging, etc.
3. `BudgetsToSnsTopicStack` - Creates a Budget with an SNS Topic subscription.
4. `CloudFrontToS3Stack` - Creates a distribution, buckets for content and logs, a certificate, etc.
5. `CloudWatchLogGroupStack` - Creates a CloudWatch Log Group with a KMS key.
6. `KmsKeyStack` - Creates a rotating KMS key with the desired removal policy.
7. `SnsTopicStack` - Creates an SNS Topic. Optionally, add subscribed SQS queues and associated dead-letter queues.
8. `WafWebAclStack` - Creates a web application firewall (WAF) stack.

## Usage

A basic `StackFactory` class instantiates stacks via `src/index.js` when `npm run build` or `cdk synth` are invoked on the command-line. The stack to create is set via [CDK runtime context](https://docs.aws.amazon.com/cdk/v2/guide/context.html).

### Command Line

Please provide a `stack` context value via `-c` or `--context`. Note: omission of a valid stack name will produce a list of available options. Add additional context values as needed.

```bash
cdk synth -c stack=KmsKeyStack -c removalPolicy=destroy
```

#### Builds

```bash
cdk synth --context stack=KmsKeyStack
npm run build -- --context stack=KmsKeyStack
```

#### Deployments

```bash
cdk deploy --context stack=KmsKeyStack
npm run deploy -- --context stack=KmsKeyStack
```

#### Tests & Linting

```bash
npm run lint
npm run test
```

### Class Use

Classes may easily be used without the factory/loader. A basic implementation appears below. Parameter use is optional in most cases.

```javascript
const app = new cdk.App()

// Without stack parameters.
const stackOne = new KmsKeyStack(app, '<Identifier>')

// With parameters
const stackTwo = new KmsKeyStack(app, '<Identifier>', {
  //...
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
})

app.synth()
```

A `StackFactory` class can also be used to create stacks.

```javascript
import StackFactory from './stack-factory.js'
StackFactory.createStack('KmsKeyStack')
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change. Please make sure to update tests as appropriate.

## License

Code is available under [MIT License](https://opensource.org/license/mit/).

Copyright (c) 2023 ZMA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
