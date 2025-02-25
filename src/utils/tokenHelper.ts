import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { IUser } from "../db/models/user";

dotenv.config();

const generateToken = (data: any, expiresIn?: string | number, type?: "access token" | "refresh token"): string => {
  const JWT_SECRET =
    type === "access token" || !type ? (process.env.JWT_SECRET as string) : (process.env.JWT_RT_SECRET as string);
  const token = jwt.sign(data, JWT_SECRET, {
    expiresIn: expiresIn || "1h",
  });
  return token;
};

const extractToken = (token: string, type?: "access token" | "refresh token"): IUser | null => {
  const JWT_SECRET = type === "access token" || !type ? process.env.JWT_SECRET : process.env.JWT_RT_SECRET;
  const secretKey: string = JWT_SECRET as string;

  let resData: any;

  const res = jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      resData = null;
    } else {
      resData = decoded;
    }
  });

  if (resData) {
    const result: IUser = <IUser>resData;
    return result;
  }
  return null;
};

export default { generateToken, extractToken };
