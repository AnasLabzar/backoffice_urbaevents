import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import { Request } from 'apollo-server'; // <-- ZID HADA

const JWT_SECRET = process.env.JWT_SECRET || 'MySuperSecretKey123';
const JWT_EXPIRES_IN = '7d';

// Function katssawb l-token (Déjà 3ndk)
export const generateToken = (user: IUser): string => {
  // ... (nafs l-code, matbdl walo)
  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
  return token;
};

// ---- ZID HADA MN HNA L-T7T ----

// Interface dyal chno kayn west l-token
export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Function kat-verifi l-token
export const verifyToken = (
  req: Request
): { user: DecodedToken | null } => {
  const authorizationHeader = req.headers.authorization || '';

  if (!authorizationHeader) {
    return { user: null };
  }

  // L-Token kayji bhal: "Bearer eyJhbGciOi..."
  const token = authorizationHeader.split('Bearer ')[1];

  if (!token) {
    return { user: null };
  }

  try {
    // 7ll l-token w rj3 l-ma3lomat dyal l-user
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return { user: decoded };
  } catch (error) {
    // Ila l-token mzyan (expired wla ghalet)
    return { user: null };
  }
};