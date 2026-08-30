import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
 

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination 

    const pipeline = []

    pipeline.push(
        {
            $match: {isPublished: true}
        }
    )

    if (query) {
        pipeline.push(
            {
                $match: {
                    $or:[
                        {
                            title: {
                                $regex: query,
                                $options:"i"
                            }
                        },
                        {
                            description: {
                                $regex: query,
                                $options:"i"
                            }
                        }
                    ]
                }
            }
        );
    }

    if(userId){
        if(!mongoose.isValidObjectId(userId)){
        throw new ApiError( 404, "Invalid User ID !!")
        }

        pipeline.push(
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
                }
            }
        )
    }
        
        pipeline.push(
            {
                $sort: {
                    [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1
                }
            }
        )

        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as:"owner"
                }
            },
            {
                $unwind: "$owner"
            },
            {
                $project: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                    owner: {
                        username: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }
            }
        )

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        {
            page,
            limit
        }
    )

return res
.status(201)
.json(
    new ApiResponse(
        200,
        videos,
        " Videos Fetched Successfully "
    )
)

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

        if(!title || !description){
            throw new ApiError( 404, " Description and Title are Required ")
        }

        const videoFileLocalPath = req.files?.videoFile?.[0]?.path
        const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
        if (!videoFileLocalPath) {
            throw new ApiError( 400, " Video File is Required ")
        }
        if (!thumbnailLocalPath) {
            throw new ApiError( 400, " Thumbnail is Required ")
        }

        const videoFile = await uploadOnCloudinary(videoFileLocalPath)
        if(!videoFile){
            throw new ApiError( 500, " Unable to upload Video on Cloudinary")
        }

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if(!thumbnail){
            throw new ApiError( 500, " Unable to upload Thumbnail on Cloudinary")
        }

        const video = await Video.create({
            videoFile: videoFile.url,
            thumbnail: thumbnail.url,
            title: title.trim(),
            description: description.trim(),
            duration: videoFile.duration,
            isPublished: true
        })

        if (!video) {
            throw new ApiError( 500, " Unable to Publish Video")
        }

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                video,
                " Video Published Successfully"
            )
        )
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError( 404, " Invalid Video Id")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField:"_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullName: "$owner.fullName",
                    avatar: "$owner.avatar",
                    coverImaage: "$owner.coverImage"
                }
            }
        }
    ])

    if (!video.length) {
        throw new ApiError(404, " Video not Found")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            video,
            " Video Fetched Successfully "
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body
    //TODO: update video details like title, description, thumbnail

    if(mongoose.isValidObjectId(videoId)){
        throw new ApiError( 400, " Invalid Video ID !!")
    }

    const video = Video.findOne({
        owner: req.user._id,
        _id: videoId
    })
    if(!video){
        throw new ApiError( 400, " Video not Found or You are not the Owner of the Video")
    }

    if(title){
        video.title = title.trim()
    }
    if(description){
        video.description = description.trim()
    }

    const thumbnailLocalPath = req.file?.path
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(!thumbnail?.url){
            throw new ApiError( 500, " Thumbnail Upload Failed")
        }

        video.thumbnail = thumbnail.url
    }

    await video.save();

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            video,
            " Video Updated Successfully "
        )
    )

    
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError( 404 ," Invalid Video ID !!")
    }

    const video = await Video.findOneAndDelete({
        owner: req.user._id,
        _id: videoId
    })
    if (!video) {
        throw new ApiError( 404, " Video not Found or you are n ot the Owner of the Video ")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            {},
            " Video Deleted Successfully "
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError( 404, " Invalid Video ID ")
    }

    const video = await Video.findOne({
        owner: req.user._id,
        _id: videoId

    })
    if (!video) {
        throw new ApiError( 404, " Video not Found or you are n ot the Owner of the Video ")
    }

    video.isPublished = !video.isPublished

    await Video.save();

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            video,
            `Video ${video.isPublished ? " Published " : " Unpublished "} Successfully`
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}