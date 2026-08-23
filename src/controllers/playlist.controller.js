import mongoose, { isValid } from "mongoose";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Playlist} from "../models/playlist.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
     
    if(!name || ! !description){
        throw new ApiError( 400 , " Name or description of playlist missing")
    }
    
    const playlist  = await Playlist.create({
        name,
        description,
        owner: req.user._id
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist created Successfully"
        )
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    const { page = 1, limit = 10} = req.query
    
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError( 400, " User is not valid ")
    }

    const playlist = [
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $lookup: {
                from: "users",
                localField:"owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]

    const result = await Playlist.mongooseAggregatePaginate(
        playlist,
        {
            page,
            limit
        }
    )

    return res
    .status(201)
    .json (
        new ApiResponse (
        200,
        result,
        "Playlist of user fetched successfully"
    )
    )

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError( 400, " Invalid playlist ID")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
            _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
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
            $unwind:"owner"
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                videos: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ])

    if (!playlist.length) {
        throw new ApiError( 404, " Playlist not found !!")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            playlist,
            " Playlist Fetched Successfully "
        )
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!mongoose.Types.ObjectId.isValid(playlistId) || 
    !mongoose.Types.ObjectId.isValid(videoId) ) {
        throw new ApiError( 404, "PlaylistId or videoId is not valid !!")
    }

    const playlist = await Playlist.findOne({
        _id: playlistId,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError( 400, "Playlist not found or You are not the Owner of the Playlist")
    }
    
    const video = await Playlist.findById(videoId)
    if(!video){
        throw new ApiError( 400, "video not found")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet:{
                videos: "videoId"
            }
            
        },
        {
            new: true
        }
    );
    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            updatedPlaylist,
            " Video Added to Playlist Successfully"
        )
    )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError( 404, "PlaylistId or VideoId is invalid !! ")
    }
    
    const playlist = await Playlist.findOne({
        _id: playlistId,
        owner: req.user._id
    })
    if(!playlist){
        throw new ApiError( 400, "Plylist not found or you are not the owner of the playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndDelete(
        playlistId,
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    );

    return res
    .status(200)
    .json(
        new ApiResponse(
            201,
            updatedPlaylist,
            " Video Removed from Plaaylist Successfully"
        )
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError( 404, " ID of Playlist is not valid")
    }

   const deletedPlaylist = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user._id
    })
    if (!deletedPlaylist) {
        throw new ApiError( 504, " Unable to Delete Playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist Removed Successfully"
        )
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError( 400, " Invalid Playlist Id")
    }
    if (!name || !description) {
        throw new ApiError( 400, " Name and Description of Playlist is Required")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $set: {
                name: name.trim(),
                description: description.trim()
            }
        },
        {
            new: true
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError( 404, " Playlist not found or you are not the owner of the playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Playlist Updated Successfully"
        )
    )

})

export{
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}