import { NextFunction, Request, Response } from "express";
import Validator from "validatorjs";
import { User } from "../db/models";
import { resHelper } from "../utils";

const resetPasswordValidation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password, confirmPassword } = req.body;
    const data = { password, confirmPassword };

    const rules: Validator.Rules = {
      password: "required|min:6",
      confirmPassword: "required|same:password",
    };
    const validate = new Validator(data, rules);

    if (validate.fails()) {
      const errors = Object.entries(validate.errors.errors)
        .map(([field, messages]) => {
          return messages.map((message) => message);
        })
        .flat();

      return res.status(400).send(resHelper.error(400, "Bad Request", errors));
    }

    const email = res.locals.userEmail;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist"));
    }
    req.body = { ...data, email, user };
    next();
  } catch (error: any) {
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

export default resetPasswordValidation;
