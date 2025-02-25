import { Request, Response } from "express";
import { literal } from "sequelize";
import * as xlsx from "xlsx";
import { User } from "../db/models";
import { IUser } from "../db/models/user";
import { passwordHelper, resHelper } from "../utils";

const getUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const users = await User.findAll({
      raw: true,
      attributes: { exclude: ["password"] },
      order: [
        [
          literal(`CASE
          WHEN role = 'root' THEN 1
          WHEN role = 'admin' THEN 2
          WHEN role = 'manager' THEN 3
          WHEN role = 'deliver' THEN 4
          ELSE 5
        END`),
          "ASC",
        ],
        ["id", "ASC"],
      ],
    });
    return res.status(200).send(
      resHelper.success(
        200,
        "OK",
        users.map((user) => ({ ...user, avatar: user.avatar ?? "avatar-default.png" }))
      )
    );
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

// const getUsers = async (req: Request, res: Response): Promise<Response> => {
//   try {
//     const currentPage = (req.body?.currentPage as unknown as number) || 1;
//     const perPage = (req.body?.perPage as unknown as number) || 1;

//     const users = await User.findAll({
//       offset: (currentPage - 1) * perPage,
//       limit: perPage,
//     });

//     const totalCount = await User.count();
//     const totalPages = Math.ceil(totalCount / perPage);

//     return res.status(200).send(
//       responseData(200, true, "OK", null, {
//         users,
//         pagination: { currentPage, perPage, totalCount, totalPages },
//         imgPath: imgHelper.generateImgPath(req),
//       })
//     );
//   } catch (error) {
//     if (error != null && error instanceof Error) {
//       return res
//         .status(500)
//         .send(responseData(500, false, error.message, error, null));
//     }
//     return res
//       .status(500)
//       .send(responseData(500, false, "Internal server error", error, null));
//   }
// };

const getUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const id = req.params?.id as unknown as number;
    const user = await User.findByPk(id, { raw: true, attributes: { exclude: ["password"] } });
    if (!user) return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist !"));
    return res.status(200).send(resHelper.success(200, "Ok", { ...user, avatar: user.avatar ?? "avatar-default.png" }));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const createUser = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { password, confirmPassword, ...data } = req.body;
    const hasUser = await User.findOne({ where: { email: data.email } });
    if (hasUser) return res.status(409).send(resHelper.error(409, "Conflict", "Email already used"));
    const passwordHashed = await passwordHelper.hashing(password);
    const user = await User.create({
      ...data,
      password: passwordHashed,
      favorites: JSON.stringify([]),
    });
    return res.status(201).send(resHelper.success(201, "Created", user));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const updateUserByEmail = async (req: Request, res: Response): Promise<Response> => {
  try {
    const updateDate = req.body;
    const userInstance = await User.findOne({
      where: { email: updateDate.email },
      attributes: { exclude: ["password"] },
    });
    if (!userInstance) return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist !"));
    userInstance.set(updateDate);
    await userInstance.save();
    const updatedUser = await User.findOne({
      where: { email: updateDate.email },
      raw: true,
      attributes: { exclude: ["password"] },
    });
    return res.status(200).send(resHelper.success(200, "The user has been successfully updated.", updatedUser));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const deleteUserById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).send(resHelper.error(404, "Not Found", "User does not exist !"));
    await user.destroy();
    return res.status(200).send(resHelper.success(200, "User has been deleted."));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

const importUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const file = req.file;
    console.log(file);

    if (!file) return res.status(400).send(resHelper.error(400, "Invalid file"));
    const workbook = xlsx.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    const existingEmails = await User.findAll({ attributes: ["email"] });
    const existingEmailSet = new Set(existingEmails.map((user) => user.email));
    const newData = data.filter((row: any) => !existingEmailSet.has(row.email)) as IUser[];
    await User.bulkCreate(newData);
    return res.status(200).send(resHelper.success(200, "Import successful"));
  } catch (error) {
    if (error != null && error instanceof Error)
      return res.status(500).send(resHelper.error(500, "Internal Server Error", error.message));
    return res.status(500).send(resHelper.error(500, "Internal Server Error"));
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUserByEmail,
  deleteUserById,
  importUsers,
};
