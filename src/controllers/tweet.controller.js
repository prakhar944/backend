import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    
    const{content} = req.body
        if(!content || content.trim() === ""){
        throw new ApiError( 400, " Content is Required for Tweet ")
    }

    if (!mongoose.isValidObjectId(req.user._id)) {
        throw new ApiError( 404, " Invalid User ID !!")
    }


    
    const tweet = await Tweet.create(
        {
            content: content.trim(),
            owner: req.user._id
        }
    )
    if (!tweet) {
        throw new ApiError( 500, " Failed to Create tweet")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            tweet,
            " Tweet Created Successfully"
        )
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError( 404, " Invalid User ID !!")
    }

    const tweets = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $unwind:"$owner"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id:"$owner._id",
                    username:"$owner.username",
                    fullName:"$owner.fullName",
                    avatar:"$owner.avatar"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]

    const result = await Tweet.aggregatePaginate(
        Tweet.aggregate(tweets),
        {
            page,
            limit
        }
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            result,
            " User Tweets Fetched Successfully "
        )
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body;
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError( 404, " Invalid Tweet ID !!")
    }
    if (!content || content.trim() == "") {
        throw new ApiError( 400, " Content is Required to update the tweet")
    }

    const tweet = await Tweet.findOne({
        _id:tweetId,
        owner:req.user._id
    })
    if (!tweet) {
        throw new ApiError( 404 , " Tweet not Found or You are not the Owner of the TWeet")
    }

    tweet.content = content.trim()
    await tweet.save()

    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            tweet,
            " Tweet Updated Successfully "
        )
    )

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId} = req.params
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError( 404, " Invalid Tweet ID !!")
    }

    await Tweet.findOneAndDelete({
        _id:tweetId,
        owner: req.user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            {},
            "Tweet Deleted Successfully"
        )
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}