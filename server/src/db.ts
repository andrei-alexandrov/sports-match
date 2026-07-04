import mongoose from "mongoose";

export async function connectDb(mongoUrl: string): Promise<void> {
  await mongoose.connect(mongoUrl);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
