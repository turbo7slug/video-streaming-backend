import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

//register user

const registerUser = asyncHandler(async(req,res)=>{


    
   
    
    //--------------------------------
    //get user info from frontend
   const {username,email,password,fullName}=req.body



   //validation-not empty
   //add other validations like email regex etc later
   if(
    [username,email,password,fullName].some((fields)=>{
        fields?.trim()===""
    })
   ){
    throw new ApiError(400,"All fields are required")
   }

//check if user already exists
  const existedUser =  await User.findOne({

    $or:[{username},{email}]
   })

   if (existedUser){
    throw new ApiError(409,"User Already exists")
   }


    //check for  avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required locally")
    }


     //upload to cloudinary
     const avatar = await uploadOnCloudinary(avatarLocalPath);
     const coverImage = await uploadOnCloudinary(coverImageLocalPath);

     if(!avatar){
        throw new ApiError(400,"Avatar is required");
     }


    //create user object (entry in db)

     const user = await User.create({
        fullName,
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

    return res.status(200).json(
        new ApiResponse(200,createdUser,"User created successfully")
    )
}) 


//login user

const loginUser = asyncHandler(async (req,res)=>{
    //req body=> data

    const {username,email,password} = req.body;

    //username or email

    if(!(username || email)){
        throw new ApiError(400,"email or username is required")
    }
    //find user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    console.log(user)
    if (!user){
        throw new ApiError(404,"User not registerd")
    }
    //password check

    const isPasswordValid  = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"invalid password")
    }
    //access and req token generate

    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)
    //send cookies

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")

    const options ={
        httpOnly:true,
        secure:true,
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
            user: loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
            )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken ||req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError("401","Invalid refresh token ")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError("401","Refresh token is expired or used")
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     const {newRefreshToken,accessToken}=await generateAccessAndRefereshTokens (user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {accessToken,RefreshToken:newRefreshToken},
             "Access Token refreshed"
         )
     )
   } catch (error) {
    throw new ApiError(401,error?.message ||"Invalid refresh token")
   }
 
})

//change password
const changeCurrentPassword  = asyncHandler(async (req,res)=>{
const {oldPassword,newPassword} = req.body
const user = await User.findById(req.user?._id)
const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
}

user.password=newPassword
await user.save({validateBeforeSave:false})

return res
.status(200)
.json(
    new ApiResponse(200,{},"password changed successfully")
)
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,
        req.user,"current user feteched succsessfully"))
})

const updateAccountDetails=asyncHandler(async (res,req)=>{
    const {fullName,email} = req.body

    if(fullName||email){
        throw new ApiError(400,"All fields are required")
    }

   const user  = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new:true}).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Account details updated successfully")
    )
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalpath = req.file?.path
    if(!avatarLocalpath){
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

   const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            avatar:avatar.url
        }
    },
    {new:true}).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"cover image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalpath = req.file?.path
    if(!coverImageLocalpath){
        throw new ApiError(400,"cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalpath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
           coverImage:coverImage.url
        }
    },
    {new:true}).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"cover image updated successfully")
    )
})
export {

    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage

}