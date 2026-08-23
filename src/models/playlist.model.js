import mongoose, { Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";



const playListSchema = new Schema({

    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    videos: {
        type:[{
        type: Schema.Types.ObjectId,
        ref: "Video"
    }],
    default: []
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
}, {
    timestamps: true
})

playListSchema.plugin(mongooseAggregatePaginate)
export const Playlist = mongoose.model("Playlist" , playListSchema)