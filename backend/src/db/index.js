import mongoose from 'mongoose';

export default async function connectDB() {
  try {
    const uri = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017';
    const dbName = process.env.DB_NAME || 'extension_db';

    const connectionInstance = await mongoose.connect(uri, {
      dbName,
    });

    console.log(
      `Extension DB connected: ${connectionInstance.connection.host} / ${dbName}`
    );
  } catch (error) {
    console.error('Extension DB connection error', error);
    process.exit(1);
  }
}
