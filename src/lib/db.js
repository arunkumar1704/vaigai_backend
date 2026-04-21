import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const uri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/vaigai-tourism";
    await mongoose.connect(uri);
    console.log("mongo DB conected !");
  } catch (error) {
    console.log("mongo DB error");
    console.log(error);
  }
};

export { connectDb };
