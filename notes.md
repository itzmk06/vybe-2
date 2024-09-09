## Finding number of subscribers in a channel

_  while calculating number of subscribers of a channel 
_ select those records from db where  channel is that channel  we want to search for
- then our task will be to count the documents 
- we'll find in subscribers model only but we'll find for channels 
- if you count for channels you'll get subscribers 
- and from channels you will get subscribers 
- everytime a user subscribed to a channel a new document  will be made 
// stopped at 2:36

## aggregation 
-each stage performs the operation on the input documents 
- means if there were 100 documents and you applied some condition and it become 50 documents then the operation for this stage will be applied only on this 50 documents 
- the documents that are output from a stage are passed to next stage 

## getUserChannelProfile in user.controller.js

-get the username fom req.params 
-create aggregate for User, aggregate is method which receives array of pipelines 
- the first pipeline will be based on match pipeline 

- {
    $match:{
        username:username.toLowerCase();
    }
- }

-store the result of User.aggregate() inside a const called channel 

## to find the number of subscribers
-to find subscribers we'll make use of lookup which will be a new pipe line 
- from-> from where you're getting the data (collection name in plural and lowercase)
- localField will be _id 
- foreign field will be channels 
- as subscribers

{
    $lookup:{
        localField:"_id",
        foreignField:"channel",
        from:"subscriptions",
        as :"subscribers"
    }
}

## to find the number of subscribed to 

{
    $lookup:{
        localFiled:"_id",
        foreignField:"subscriber",
        from:"subscriptions",
        as:"subscribedTo"
    }
}

-whenever it's a field we should make use of dollor symbol $ 

- we can add new fields to a model with the help of addFields pipeline 
{
    $addFields:{
        subscribersCount:{
            $size:$subscribers
        },
        subscribedToCount:{
            $size:$subscribedTo
        },
        isSubscribed:{
            $cond:{
                if:{$in:[req.user._id,"$subscribers.subscriber"]},
                then:true,
                else:false
            }
        }
    }
}

then at outer level add another pipeline which says what are the things you want to show to frontend just pust 1 infront of that fieldname 

{
    $project:{
        fullName:1,
        username:1,
        like that 
    }
}