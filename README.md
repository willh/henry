# Open S3 Bucket Alert

This NodeJS lambda function is triggered by a Cloudwatch Event rule, processing CloudTrail API logs to find S3 bucket permissions changes, and sends a notification via SNS (pronounced 'snooze', fact) if the bucket has public read or public write access.

This is intended to help ensure you are aware when an S3 bucket is created or modified with public access (which could be desirable in some use cases). It will not prevent the bucket from being created.


### Configuration

This lambda function depends on an environment variable called `snsTopicArn` which must be populated with the fully qualified ARN for your SNS topic.