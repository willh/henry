const AWS = require("aws-sdk");
const allUsersUri = "http://acs.amazonaws.com/groups/global/AllUsers";
const snoozeTopic = process.env.snsTopicArn;

exports.handler = (event, context) => {

    var snooze = new AWS.SNS();
    var notification = {
        Message: '',
        Subject: 'S3 Bucket Permission Alert',
        TopicArn: snoozeTopic
    };
    
    var bucketName = event.detail.requestParameters.bucketName;
    var grants = event.detail.requestParameters.AccessControlPolicy.AccessControlList.Grant;
    
    // Grant[0] is always owner, so we only need to check further if we have more than 1 grant
    if (grants.length > 1) {
        for (const grant of grants) {
            if (grant.Grantee.URI && grant.Grantee.URI == allUsersUri) {
                var msg = "S3 bucket " + bucketName + " has just had " + grant.Permission + " access granted to the whole world!\n";
                console.log(msg);
                notification.Message += msg;
            }
        }
        
        if (notification.Message != '') {
            snooze.publish(notification, function(err, data) {
                if (err) console.log(err, err.stack);
                else console.log("Successfully sent notification");
            });
        }
    }
    
};