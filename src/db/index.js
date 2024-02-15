import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB= async ()=>{


    try {
        console.log(`${process.env.MONGODB_URI}/${DB_NAME}`)
       const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`MONGODB connected  DBHOST: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.error("Mongo DB connection Failed",error);
        process.exit(1);
    }
}


export default connectDB    