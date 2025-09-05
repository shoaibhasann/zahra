import mongoose from "mongoose";

const connection = {};

export async function dbConnect(){
        if(connection.isConnected){
            console.log("✅Already connected to DB");
            return;
        }

        try {
            const db = await mongoose.connect(process.env.MONGO_URI || "");
            connection.isConnected = db.connections[0].readyState;

            console.log("✅ Mongodb connected successfully!");
        } catch (error) {
             console.log("❌ Mongodb connection failed!", error);
             process.exit(1);
        }
}