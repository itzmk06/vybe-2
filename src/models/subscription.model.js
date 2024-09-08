import mongoose from "mongoose";

const subscriptionSchema=new mongoose.Schema({
    subscriber:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        type:mongoose.Schema.Types.ObjectId.ObjectId,
        ref:"User"
    }

},{timeStamps:true});

export const Subscription=mongoose.model("Subscription",subscriptionSchema);