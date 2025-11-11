import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IRole } from './Role'; // N-importiw l-interface dyal Role

// Interface: Katgolina chno homa l-ma3lomat li f l-User (l-TypeScript)
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // '?' hit ma bghinach nrg3oh l-frontend
  role: IRole['_id']; // L-ID dyal l-Role dyalo (Admin, Creative...)
  isActive: boolean; // Wach l-compte khdam wla la
}

// Schema: Kaychrah l-Mongoose kifach ykhzn l-User
const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Kol user 3ndo email dyalo
      lowercase: true, // Dima email b 7rof sghar
    },
    password: {
      type: String,
      required: true,
      select: false, // <-- MOHIM: Mli njib user mn database, majibch l-password m3ah
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: 'Role', // Hna fin kanrbto l-User m3a l-Model 'Role'
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ---- HASHING L-PASSWORD (Otomatik) ----
// Qbl maytssjl ay user jdid (pre-save hook)
UserSchema.pre<IUser>('save', async function (next) {
  // Kan-hashiw ghir ila l-password t-modifa (wla jdid)
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    // N-generiw "salt" (chwiya dyal l-mel7) bach nchffro
    const salt = await bcrypt.genSalt(10);
    // N-hashiw l-password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Exporti l-model
export default mongoose.model<IUser>('User', UserSchema);