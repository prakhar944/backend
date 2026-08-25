import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, " Invalid Channel Id !!")
    }

    const channel = await Subscription.findById(channelId)
    if (!channel) {
        throw new ApiError( 404, " Channel not found")
    }

    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if(subscription){
        await Subscription.findByIdAndDelete(subscription._id)
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            202,
            {subscribed: false},
            "Channel Unsubscribed Successfully"
        )
    )
}

    await Subscription.create({
        subscriber: req.user_id,
        channel: channelId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            202,
            {subscribed: true},
            "Channel Subscribed Successfully"
        )
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
     if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, " Invalid Channel Id !!")
    }

    const channel = await Subscription.findById(channelId)
    if (!channel) {
        throw new ApiError( 404, " Channel does not exist")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscribers",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        {
            $unwind: "$subscriber"
        },
        {
            $project: {
                _id: 1,
                channel: 1,
                createdAt: 1,
                subscriber: {
                    _id: "$subscriber._id",
                    username: "$subscriber.username",
                    fullName: "$subscriber.fullName",
                    avatar: "$subscriber.avatar"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    return res
    .status(200)
    .json( 
        new ApiResponse(
            200,
            subscribers,
            " Subscribers Fetched Successfully "
        )
    )
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError( 402, " Invalid Subscriber Id !!")
    }

    const user = await User.findById(subscriberId)

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $project: {
                _id: 1,
                subscriber: 1,
                createdAt: 1,
                channel: {
                    _id: "$channel._id",
                    username: "$channel.username",
                    fullName: "$channel.fullNName",
                    avatar: "$channel.avatar",
                    coverImage: "$channel.coverImage"
                }
            }
        },
        {
            $sort:{
                createdAt: -1
            }
        }
    ]);

    return res
    .status(201)
    .json(
        new ApiResponse(
            202,
            channels,
            " Subscribed Channels Fetched Successfully"
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}