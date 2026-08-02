import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";




const generateAccessAndRefreshTokens = async(userId) => {
   try {
     const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return { accessToken, refreshToken}

   } catch (error) {
      throw new ApiError(500, " Unable to generate refresh and access tokens")
   }
}

const registerUser = asyncHandler( async (req,res) => {
   
// GET USER DETAILS FROM FRONTEND
// VALIDATE USER DETAILS
// CHECK IF USER ALREADY EXISTS
// CHECK FOR IMAGES 
// UPLOAD IMAGES TO CLOUDINARY
// CREATE USER OBJECT - ENTRY IN DB
// REMOVE PASSWORD AND REFRESH TOKEN FROM RESPONSE
// CHECK FOR USER CREATION 
// RETURN RESPONSE TO FRONTEND


   const {fullName, email, username, password} =  req.body
   
   if(fullName === "" || email === "" || username === "" || password === ""){
      throw new ApiError( 400, "All fields are required")
   }

   const existedUser = await User.findOne( { 
      $or: [{email: email}, {username: username}]
   })
      if(existedUser){
         throw new ApiError(409, " User with this email or username already exists ")
      }

    const avatarLocalPath = req.files?.avatar[0]?.path
   //  const coverImagelocalPath = req.files?.coverImage[0]?.path

   let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
      coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath ) {
      throw new ApiError( 400, "Avatar image is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
      throw new ApiError( 500, "Error while uploading avatar image on cloudinary")
    }
    
    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
})
   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   )

   if(!createdUser){
      throw new ApiError( 500, "Error while registering the user")
   }

return res.status(201).json(
   new ApiResponse(201, createdUser, "User Registered successfully")
)

})

const loginUser = asyncHandler( async (req,res) => {
   // req body -> data
   // check for username or email
   // find user
   // password check
   // give access and refresh tokens to user
   // send cookies

   const {username,email,password} =  req.body
   console.log(email);
   

   if(!username && !email){
      throw new ApiError(400, "username or email is required")
   }

   const user = await User.findOne({
      $or: [{username},{email}]
   })
   if(!user){
      throw new ApiError(400 , "User not found")
   }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if(!isPasswordValid){
      throw new ApiError(400, "Password is not valid")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = {
      httpOnly: true,
      secure: true
   }
 
   return res.status(200)
               .cookie("accessToken", accessToken)
               .cookie("refreshToken", refreshToken)
               .json(
                  new ApiResponse(
                     200,
                     {
                        user: loggedInUser,accessToken,refreshToken
                     },
                     "UserLogged In Successfully"
                  )
               )

})

const logoutUser = asyncHandler( async (req,res) => {
   // clear cookies
   // reset access and refresh tokens
   User.findByIdAndUpdate(
      req.user._id,
      {
         $set: {
            refreshToken: undefined
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

   return res.status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(
      new ApiResponse(200,{},"user Logged Out SuccessFully")
   )
})

const refreshAccessToken = asyncHandler( async (req,res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new ApiError(400, "Refresh Token is required")
   }
try{
   const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

   const user = await User.findById(decodedToken?._id)
   if(!user){
      throw new ApiError(401, "Invalid Refresh Token")
   }

   if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError( 401, "Refresh Token is expired or used")
   }

   const options = {
      httpOnly: true,
      secure: true
   }

   const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)


   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse(
         200,
         {accessToken, refreshToken: newRefreshToken},
         "Access Token Refreshed Successfully"
      )
   )
} catch (error) {
   throw new ApiError(401, error?.message || "Invalid Refresh Token")
}
})

const changeCurrentPassword = asyncHandler( async (req,res) => {
   const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
      throw new ApiError(400, "Old Password is not correct")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         {},
         "Password changed successfully"
      )
   )
})

const getCurrentUser = asyncHandler( async (req, res) =>{
   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         req.user,
         "current user get successfully"
      )
   )
})

const updateAccountDetails = asyncHandler( async (req, res) => {
   const { fullName, email} = req.body

   if(!fullName && !email){
      throw new ApiError( 400, "fullName or email is required")
   }
    
   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            fullName: fullName || req.user?.fullName,
            email: email || req.user?.email
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "Account Details Updated Successfully"
      )
   )

})

const updateUserAvatar = asyncHandler( async (req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
   throw new ApiError(400, "Avatar image is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
      throw new ApiError(500, "Error while uploading avatar image on cloudinary")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            avatar: avatar.url
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user,
         "Avatar Updated Successfully"
      )
   )

})

const updateUserCoverImage = asyncHandler( async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath){
   throw new ApiError(400, "Cover image is required")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!coverImage.url){
      throw new ApiError(500, "Error while uploading cover image on cloudinary")
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set: {
            coverImage: coverImage.url
         }
      },
      {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(
      200,
      user,
      "Cover Image Updated Successfully"
   )

})


export { 
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage
} 