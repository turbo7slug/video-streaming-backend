import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors'

const app=express()

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

//configurations

app.use(express.json({limit:"16kb"}))//to accept json eg:form filled
app.use(express.urlencoded({extended:true,limit:"16kb"}))//take data from urs --> extended to take nested objects
app.use(express.static("public"))//files pdfs images favicons
app.use(cookieParser())//to do CRUD on secure cookies


//routes import 
import userRouter from "./routes/user.routes.js"

//declare routes
app.use("/api/v1/users",userRouter)

export {app}