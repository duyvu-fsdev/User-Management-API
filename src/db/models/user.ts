import { DataTypes, Model, Optional } from "sequelize";
import connection from "../../config/dbConnect";

export interface IUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface UserInput extends Optional<IUser, "id"> {}
export interface UserOutput extends Required<IUser> {}

class User extends Model<IUser, UserInput> implements IUser {
  public id!: number;
  public firstName!: string;
  public lastName!: string;
  public email!: string;
  public password!: string;
  public role!: string;
  public isActive!: boolean;
  public isVerified!: boolean;
  public avatar!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    firstName: { unique: true, allowNull: false, type: DataTypes.STRING },
    lastName: { allowNull: false, type: DataTypes.STRING },
    email: { allowNull: false, type: DataTypes.STRING },
    password: { allowNull: false, type: DataTypes.STRING },
    role: { allowNull: false, type: DataTypes.STRING },
    isActive: { allowNull: false, type: DataTypes.BOOLEAN },
    isVerified: { allowNull: false, type: DataTypes.BOOLEAN },
    avatar: { type: DataTypes.STRING },
  },
  { timestamps: true, sequelize: connection, underscored: false }
);

export default User;
