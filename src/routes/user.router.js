import {Router} from "express";
import { changePassword, getCurrentUser, refreshTokenHandle, registerUser, updateTextProfile, updateUserAvatar, userLogin, userLogout } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router=Router();

router.route("/register").post(upload.fields(
    [
        {
            name:"avatar",
            maxCount:1,
        },
        {
            name:"coverImage",
            maxCount:1,
        }
    ]
),registerUser);

router.route("/login").post(userLogin);

// secured routes
router.route("/logout").post(verifyJwt,userLogout);

router.route("/refresh-token").post(verifyJwt,refreshTokenHandle);

router.route("/change-password").post(verifyJwt,changePassword);

router.route("/get-current-user").post(verifyJwt,getCurrentUser);

router.route("/update-text-profile").post(verifyJwt,updateTextProfile);

router.route("/update-avatar").post(verifyJwt,upload.fields(
    [
        {
            name:"avatar",
            maxCount:1,
        }
    ]
),updateUserAvatar);

export default router;
