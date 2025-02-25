import express from "express";
import { authenticated, checkRole, validation } from "../middleware";
import { authController, userController } from "../controller";
import multer from "multer";
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
//auth routes
router.post("/get-otp", validation.otpRegisterValidation, authController.getOtp);
router.post("/register", validation.registerValidation, authController.register);
router.post("/login", authController.userLogin);
router.get("/profile", authenticated, authController.getProfile);
router.patch("/update-profile", authenticated, authController.updateProfileById);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password", validation.resetPwValidation, authController.resetPassword);
//user routes
router.get("/users", authenticated, checkRole(["admin"]), userController.getUsers);
router.get("/user/:id", authenticated, checkRole(["admin"]), userController.getUserById);
router.post("/user", authenticated, checkRole(["admin"]), userController.createUser);
router.patch("/update-user", authenticated, checkRole(["admin"]), userController.updateUserByEmail);
router.delete("/user/:id", authenticated, checkRole(["admin"]), userController.deleteUserById);
router.post("/users/import", authenticated, checkRole(["admin"]), upload.single("file"), userController.importUsers);

export default router;
