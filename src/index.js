// require("dotenv").config({path:'./env'})

/*  "scripts": {
    "start": "node --env-file=.env src/index.js",
    "dev": "nodemon --env-file=.env src/index.js"
  } */
import dotenv from 'dotenv'
import connectDB from './db/index.js';
import {app} from "./app.js"

dotenv.config({
    path:'./.env'
})

connectDB()
.then(()=>{

    app.on("error",(error)=>{
        console.log("App not able to talk to database",error)
        throw error;
       })

    app.listen(process.env.PORT||8000,()=>{
        console.log(`server listening on PORT : ${process.env.PORT}`);
    })
})
.catch((error)=>{
    console.error("MONGODB connection FAILED",error)
})


















































/*
import express from 'express';

const app=express();

;(async ()=>{

        try {
           await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
           app.on("error",(error)=>{
            console.log("App not able to talk to database",error)
            throw error;
           })

           app.listen(process.env.PORT,()=>{
            console.log(`app listening on PORT ${process.env.PORT}`)
           })
            
        } catch (error) {
            console.error("Error: ",error)
            throw error
        }
})()
*/