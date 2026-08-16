import mongoose, {isValidObjectId} from "mongoose";
import {Comment} from "../models/comment.model.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler( async (req, res) => {

    const {videoId} = req.params;
    const {page = 1, limit = 10} = req.query

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError( 400, "Invalid videoId")
    }

    const comments = [
        {
            $match: {video: new mongoose.Types.ObjectId(videoId)}

        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                content: 1,
                video: 1,
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
            $sort: {createdAt: -1}
        }
    ];

    const result = await Comment.aggregatePaginate(comments, {page, limit});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            result,
            "Comments fetched Successfully"
        )
    )
})

const addComment = asyncHandler( async (req,res) => {
    const {videoId} = req.params
    const {content} = req.body
    const {_id} = req.user

    if(!mongoose.Types.ObjectId.isValid(videoId) || !content || content.trim() === ""){
        throw new ApiError( 400, "Id of video is not valid or content of the video is not available")
    }

    const comment = await Comment.create(
        {
            content: content.trim(),
            video: new mongoose.Types.ObjectId(videoId),
            owner: req.user._id
        }
    )

    if(!comment){
        throw new ApiError( 500, "Comment is not added due to some internal server error")
    }
    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment added Successfully"
        )
    )


})

const updateComment = asyncHandler(async (req, res) => {

    const {commentId} = req.params;
    const {content} = req.body;
    const {_id} = req.user;

    if(!mongoose.Types.ObjectId.isValid(_id)){
        throw new ApiError( 400, "Id of user is not valid");
    }

    if( !mongoose.Types.ObjectId.isValid(commentId) || !content || content.trim() === ""){
        throw new ApiError( 400, "Id of comment is not valid or content of the comment is not available")
    }

    // const comment = await Comment.findByIdAndUpdate(
    //     commentId,
    //     {
    //         content: content.trim()
    //     },
    //     {new: true}
    // )

    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError( 404, "Comment not found")
    }
    if(comment.owner.toString() !== _id.toString()){
        throw new ApiError( 402, "you are not authorized to update this comment")
    }

    comment.content = content.trim()
    await comment.save()

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment updated Successsfully"
        )
    )
})

const deleteComment = asyncHandler( async (req, res) => {
   const {commentId} = req.params
   const {_id} = req.user

   if(!mongoose.Types.ObjectId.isValid(commentId)){
     throw new ApiError( 400, "CommentId is not valid")
   }
   const comment = await Comment.findById(commentId)

   if(comment.owner.toString() !== _id.toString()){
    throw new ApiError( 403, " You are not authorized to delete this comment")
   }

   await Comment.findByIdAndDelete(commentId);

   return res
   .status(201)
   .json(
    new ApiResponse(
        200,
        {},
        "Comment delete Successfully"
    )
   )

})


export  {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}