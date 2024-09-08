import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
    },
    avatar:{
        type:String,
        required:true,
    },
    coverImage:{
        type:String,
    },
    password:{
        type:String,
        required:true,
        trim:true,
    },
    refreshToken:{
        type:String,
    },
    watchHistory:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    }


},{timestamps:true});


// this is to hash the given password 
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password=await bcrypt.hash(this.password,10);
    next();
});


// creating our own methods for this schema
// this is to compare the passwords given and stored password 
userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=async function(){
    return await jwt.sign(
        {
            _id:this._id,
            username:this.username,
            fullName:this.fullName,
            email:this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=async function(){
    return await jwt.sign(
        {
            _id:this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}


export const User=mongoose.model("User",userSchema);

