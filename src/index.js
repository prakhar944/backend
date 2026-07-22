import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});

connectDB()
.then( () =>{
    app.on("error" , (err) => {
        console.log("Error while connecting to the server : ", err);
        throw err;
    })
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running at port ${process.env.PORT || 8000}`);
    })
})
.catch((error) => {
    console.log("MONGODB CONNECTION FAILED!! : ", error);
})