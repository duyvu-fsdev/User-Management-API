import { Request, Response, NextFunction } from "express";
import { resHelper, tokenHelper } from "../utils";

const authenticated = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authToken = req.headers["authorization"];
    const token = authToken && authToken.split(" ")[1];
    if (!token) return res.status(401).send(resHelper.error(401, "Unauthorized", "none-token"));
    const result = tokenHelper.extractToken(token!);
    if (!result) return res.status(401).send(resHelper.error(401, "Unauthorized", "Invalid or expired token"));
    if (!result.isActive) return res.status(403).send(resHelper.error(403, "Forbidden", "Account is inactive"));
    if (!result.isVerified) return res.status(403).send(resHelper.error(403, "Forbidden", "Account is unverified"));
    res.locals.id = result?.id;
    res.locals.role = result?.role;
    next();
  } catch (err: any) {
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

export default authenticated;
