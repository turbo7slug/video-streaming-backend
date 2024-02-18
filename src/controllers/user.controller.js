import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { application } from "express";

const registerUser = asyncHandler(async(req,res)=>{


    
   
    
    //--------------------------------
    //get user info from frontend
   const {username,email,password,fullname}=req.body



   //validation-not empty
   //add other validations like email regex etc later
   if(
    [username,email,password,fullname].some((fields)=>{
        fields?.trim()===""
    })
   ){
    throw new ApiError(400,"All fields are required")
   }

//check if user already exists
  const existedUser =  User.findOne({

    $or:[{username},{email}]
   })

   if (existedUser){
    throw new ApiError(409,"User Already exists")
   }


    //check for  avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }


     //upload to cloudinary
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

     if(!avatar){
        throw new ApiError(400,"Avatar is required");
     }


    //create user object (entry in db)

     const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    
    //check for user creation
    //remove password and refresh token from response
    const createdUser = await User.findById(user._id).select( 
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }

    //return res

    return res.statue(200).json(
        new application(200,createdUser,"User created successfully")
    )
}) 

export {registerUser}