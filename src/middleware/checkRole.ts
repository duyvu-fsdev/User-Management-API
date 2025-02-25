import { NextFunction, Request, Response } from "express";
import { resHelper } from "../utils";

const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = res.locals.role;
    if (roles.includes(userRole)) return next();
    return res
      .status(403)
      .send(resHelper.error(403, "Forbidden", "You do not have permission to perform this action "));
  };
};
export default checkRole;
