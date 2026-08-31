import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user._id

    const totalVideos = await Video.countDocuments({
        owner: userId
    }) 

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    })

    const totalLikes = await Like.countDocuments({
        likedBy: userId
    })

    const totalViews = await Video.aggregate([
        {
            $match: {
                owner: userId
            }
        },
        {
            $group: {
                _id: null,
                totalViews: {$sum: "$views"}
            }
        }
    ])

    const stats = {
        totalVideos,
        totalSubscribers,
        totalLikes,
        totalViews: totalViews[0]?.totalViews || 0
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            stats,
            " Channel Stats Fetched Successfully "
        )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const userId = req.user._id
    const { page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError( 404, " Invalid User ID !!")
    }

    const pipeline = [
        {
            $match: {
                owner: userId
            }
        },
        {
            $sort: {createdAt: -1}
        }
    ];

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        {
            page,
            limit
        }
    );
    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            videos,
            " All Videos of Channel Fetched Successfully "
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }