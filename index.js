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
    var publicPermissions = [];
    var eventType;
    
    if (event.detail.eventName == "PutBucketAcl") { // check list of grants for permissions
        eventType = "changed bucket";
        var grants = event.detail.requestParameters.AccessControlPolicy.AccessControlList.Grant;
        // Grant[0] is always owner, so we only need to check further if we have more than 1 grant
        if (grants.length > 1) {
            for (const grant of grants) {
                if (grant.Grantee.URI && grant.Grantee.URI == allUsersUri) {
                    if (grant.Permission == "READ") {
                        publicPermissions.push("read");
                    } else {
                        publicPermissions.push("write")
                    }
                }
            }
        }
    } else { // event is CreateBucket, check acl for permissions
        eventType = "created bucket";
        var acl = event.detail.requestParameters['x-amz-acl']
        if (acl[0] == "public-read") {
            publicPermissions.push("read");
        } else if (acl[0] == "public-read-write") {
            publicPermissions.push("read");
            publicPermissions.push("write");
        }
    }
    
    if (publicPermissions.length != 0) {
        var userDetails = getUserDetails(event);
        notification.Message = userDetails.user + (userDetails.agent || "") + " has just " + eventType + " "
            + bucketName + " which now has public " + publicPermissions.join(" and ") + " access.\n";
        console.log(notification.Message);
        snooze.publish(notification, function(err, data) {
            if (err) console.log(err, err.stack);
            else console.log("Successfully sent notification");
        });
    }
    
};

function getUserDetails(event) {
    var userIdentity = event.detail.userIdentity;
    var userDetails = {
        user: null,
        agent: null
    };
    
    if (userIdentity.type == "Root") {
        userDetails.user = "Root user";
    } else if (userIdentity.type == "IAMUser") {
        userDetails.user = "IAM user '" + userIdentity.userName + "'";
    } else {
        userDetails.user = "Service user"; 
        //TODO: flesh out identifying which role/policy invoked this change
    }
    
    // add some userAgent detail if it wasn't a service call
    if (typeof event.detail.userAgent !== "undefined") {
        if (event.detail.userAgent.indexOf("Console") > -1) {
            userDetails.agent = " via AWS Console";
        } else if (event.detail.userAgent.indexOf("Terraform") > -1) {
            userDetails.agent = " via Terraform";
        } else if (event.detail.userAgent.indexOf("aws-sdk") > -1) {
            userDetails.agent = " via AWS SDK";
        } else if (event.detail.userAgent.indexOf("aws-cli") > -1) {
            userDetails.agent = " via AWS CLI";
        }
    }
    
    return userDetails;
}