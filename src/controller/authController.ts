import dotenv from "dotenv";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import redisClient from "../config/redisClient";
import { User } from "../db/models";
import { generateOtp, passwordHelper, resHelper, tokenHelper } from "../utils";

dotenv.config();

const getOtp = async (req: Request, res: Response): Promise<Response> => {
  try {
    const email = res.locals.email;
    const otp = generateOtp(6);
    const key = `otpReg:${email}`;
    const data = JSON.stringify({ otp });
    try {
      await redisClient.setEx(key, 180, data);
    } catch (err) {
      console.error("Redis Error:", err);
      return res.status(500).send(resHelper.error(500, "Redis Error"));
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_PASSWORD },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: "Verify email - Xác minh email",
      html: `
      <div style="background-color:#eeeeee;padding:10px 20px; border-radius: 6px; width:fit-content">
        <p style="font-weight: bold;">You are receiving this because you (or someone else) have requested the register an account on XXX.</p>
        <p style="font-weight: bold;">Please enter the OTP code below to continue the registration process.</p>
        <table style="margin: 0" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td>
            <div style="display:inline-block; background-color: #1E88E5; color: white; font-size: 24px; font-weight: bold; border-radius: 6px; padding: 10px 20px; letter-spacing: 5px;">${otp}</div>
            <p> OTP code is valid for <strong>3 minutes</strong>.</p>
          </td></tr>
        </table>    
      </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(202).send(resHelper.success(202, "Pending verification"));
    } catch (err) {
      console.error("Email sending error:", err);
      return res.status(500).send(resHelper.error(500, "Email sending failed"));
    }
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, firstName, lastName, role, otp } = res.locals.data;
    const key = `otpReg:${email}`;
    const data = await redisClient.get(key);
    if (!data) return res.status(400).send(resHelper.error(400, "Bad Request", "OTP expired or invalid"));
    const { otp: storedOtp } = JSON.parse(data);
    if (storedOtp !== otp) return res.status(400).send(resHelper.error(400, "Bad Request", "Invalid OTP"));
    await redisClient.del(key);
    const passwordHashed = await passwordHelper.hashing(password);
    const userData = { email, firstName, lastName, role };
    await User.create({ ...userData, password: passwordHashed, isActive: true, isVerified: true });
    return res.status(201).send(resHelper.success(201, "Your account has been created successfully"));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const userLogin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;
    console.log("userLogin -> email", email, password);

    const user = await User.findOne({
      attributes: ["id", "isVerified", "isActive", "role", "password"],
      where: { email },
    });
    if (!user) return res.status(404).send(resHelper.error(404, "Not Found", "Email not registered !"));
    if (user && !(await passwordHelper.compare(password, user.password)))
      return res.status(401).send(resHelper.error(401, "Unauthorized ", "Password is incorrect !"));
    const { isVerified, isActive, role, id } = user;
    const dataGenerate = { isVerified, isActive, role, id };
    const expiresIn = 15 * 60 * 60 * 24;
    const expiresOn = Date.now() + expiresIn * 1000;
    const accessToken = tokenHelper.generateToken(dataGenerate, expiresIn);
    const refreshToken = tokenHelper.generateToken(dataGenerate, "7d", "refresh token");
    return res
      .status(200)
      .send(
        resHelper.success(200, "Login successfully", { refreshToken, accessToken: { token: accessToken, expiresOn } })
      );
  } catch (error) {
    console.log("userLogin", error);

    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const getProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = res.locals.id;
    const user = await User.findByPk(id, { raw: true, attributes: { exclude: ["password"] } });
    if (!user) return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist !"));
    return res.status(200).send(resHelper.success(200, "Ok", user));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const updateProfileById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = res.locals.id;
    const updateDate = req.body;
    const userInstance = await User.findByPk(id);
    if (!userInstance) return res.status(404).send(resHelper.error(404, "Not Found", "Data not found !"));
    userInstance.set(updateDate);
    await userInstance.save();
    const updatedUser = await User.findByPk(id, { raw: true, attributes: { exclude: ["password"] } });
    return res.status(200).send(resHelper.success(200, "The user has been successfully updated", updatedUser));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ attributes: ["id"], where: { email } });
    if (!user) return res.status(404).send(resHelper.error(404, "Not Found", "Email does not exist !"));

    const otp = generateOtp(6);
    const key = `otpResetPw:${email}`;
    const data = JSON.stringify({ otp });
    try {
      await redisClient.setEx(key, 180, data);
    } catch (err) {
      console.error("Redis Error:", err);
      return res.status(500).send(resHelper.error(500, "Redis Error"));
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_ADDRESS, pass: process.env.EMAIL_PASSWORD },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: user.email,
      subject: "Password reset - Đặt lại mật khẩu",
      html: `
        <div style="background-color:#eeeeee;padding:10px 20px; border-radius: 6px; width:fit-content">
        <p style="font-weight: bold;">You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
        <p style="font-weight: bold;">Please enter the OTP code below to continue the process.</p>
        <table style="margin: 0" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td>
            <div style="display:inline-block; background-color: #1E88E5; color: white; font-size: 24px; font-weight: bold; border-radius: 6px; padding: 10px 20px; letter-spacing: 5px;">${otp}</div>
            <p> OTP code is valid for <strong>3 minutes</strong>.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
          </td></tr>
        </table>    
        </div>
         `,
    };
    const info = await transporter.sendMail(mailOptions);
    if (info.response)
      return res.status(202).send(resHelper.success(202, `Password reset email has been sent successfully !`));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password, otp } = res.locals;
    const userInstance = await User.findOne({ attributes: ["id"], where: { email } });
    if (!userInstance) return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist !"));
    const key = `otpResetPw:${email}`;
    const data = await redisClient.get(key);
    if (!data) return res.status(400).send(resHelper.error(400, "Bad Request", "OTP expired or invalid"));
    const { otp: storedOtp } = JSON.parse(data);
    if (storedOtp !== otp) return res.status(400).send(resHelper.error(400, "Bad Request", "Invalid OTP"));
    await redisClient.del(key);
    const passwordHashed = await passwordHelper.hashing(password);
    userInstance.set({ password: passwordHashed });
    await userInstance.save();
    return res.status(200).send(resHelper.success(200, "Your password has been reset successfully !"));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

export default { getOtp, register, userLogin, getProfile, updateProfileById, forgotPassword, resetPassword };
