import bcrypt from "bcryptjs";
import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    /** Only `lead` may reveal the un-redacted original report. */
    role: { type: String, enum: ["analyst", "lead"], default: "lead" },
  },
  { timestamps: true },
);

userSchema.methods.verifyPassword = function verifyPassword(this: UserDoc, plain: string) {
  return bcrypt.compare(plain, this.passwordHash);
};

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>> & {
  verifyPassword(plain: string): Promise<boolean>;
};

export const User = model<InferSchemaType<typeof userSchema>>("User", userSchema);

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}
