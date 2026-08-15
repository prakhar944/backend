import {Router} from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getVideoComments, addComment, updateComment, deleteComment } from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);


router.route("/:videoId").get( getVideoComments).post( addComment);
router.route("/c/:commentId").patch( updateComment).delete(deleteComment)


export default router;