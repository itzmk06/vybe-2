import dotenv from "dotenv";
import connectToDb from "./db/index.js";

//* this is the best approach 
dotenv.config({
    path:'./env',
})


connectToDb();






















// * this is the first approach of connecting to db 
// import express from "express";
// const app=express();
// ;(async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`);
//         app.on("error",(err)=>{
//             console.log("Some error occurred!",err);
//             throw err;
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`App  is listening on port ${process.env.PORT}`);
//         })
//     }catch(err){
//         console.log(err);
//         throw err;
//     }
// })()