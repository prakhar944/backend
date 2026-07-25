import multer from "multer";

const storagr = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

export const upload = multer ({
    storage: storagr,
})