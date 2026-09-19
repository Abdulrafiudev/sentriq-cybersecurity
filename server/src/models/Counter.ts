import { Schema, model } from "mongoose";

/** Atomic sequence source for human-readable incident IDs (INC-104, INC-105…). */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model("Counter", counterSchema);

export async function nextSequence(name: string, startAt = 0): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 }, $setOnInsert: {} },
    { new: true, upsert: true },
  ).lean();
  const seq = (doc?.seq ?? 1) + startAt;
  return seq;
}

export async function resetSequence(name: string, value: number): Promise<void> {
  await Counter.findByIdAndUpdate(name, { seq: value }, { upsert: true });
}
