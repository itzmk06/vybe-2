import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  const refreshToken = await user.generateRefreshToken();
  const accessToken = await user.generateAccessToken();

  // update refresh token of user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { refreshToken, accessToken };
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, password, fullName, email } = req.body;

  // check whether all the fields are empty
  if (!username || !password || !fullName || !email) {
    throw new ApiError(400, "All fields are required!");
  }

  // check whether username or password already exist
  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existedUser) {
    throw new ApiError(401, "Already users with same username / email exist!");
  }
  // check avatar is uploaded by user
  let avatarLocalPath = "";
  if (!(req && req?.files && req?.files?.avatar)) {
    throw new ApiError(403, "Please upload avatar!");
  } else {
    avatarLocalPath = req?.files?.avatar[0]?.path;
  }

  let coverImagePath = "";
  if (!(req && req?.files && req?.files?.coverImage)) {
    coverImagePath = "";
  } else {
    coverImagePath = req?.files?.coverImage[0]?.path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(402, "Please upload user avatar!");
  }

  // upload the avatar and coverImage to cloud
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImagePath);

  // check whether the images are uploaded or nto else our db will pakka blast
  if (!avatar) {
    throw new ApiError("Avatar is required!");
  }

  // create an user object and make entry in db
  const user = await User.create({
    fullName: fullName,
    email: email,
    password: password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // remove password and refresh token from user object if created
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  // check whether user is created successfully
  if (!createdUser) {
    throw new ApiError(500, "Oops! Something went wrong on our side! :(");
  }

  // return the response
  return res
    .status(201)
    .json(new ApiResponse(200, "user registered successfully!", createdUser));
});

const userLogin = asyncHandler(async (req, res) => {
  // get the detail from user
  const { username, email, password } = req.body;

  // if those primary details are not given throw error
  if (!username && !email) {
    throw new ApiError(400, "Please enter either username or email!");
  }

  // find user from db based on username or email recieved
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user with provided fields not present throw error
  if (!user) {
    throw new ApiError(400, "user not found!");
  }

  // check whether password is correct
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "password is incorrect!");
  }

  //generate access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // send data  in cookies
  const loggedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(200, "User logged in successfully!", {
        user: loggedUser,
        accessToken: accessToken,
        refreshToken: refreshToken,
      })
    );
});

const userLogout = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.body._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(201)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

const refreshTokenHandle = asyncHandler(async (req, res) => {
  // get refresh token either from cookies or from request body
  const incomingRefreshToken =
    req?.body?.refreshToken || req?.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized access!");
  }
  try {
    // verify incoming refresh token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      throw new ApiError(
        401,
        "Failed to verify your login! Try again later..."
      );
    }

    // get user from db with help of decoded token which has user info
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(
        501,
        "We're not able to fetch your info, Please try again later..."
      );
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(
        401,
        "You don't have permissions to access this account!"
      );
    }

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    const options = {
      secure: true,
      httpOnly: true,
    };
    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access token refreshed!", {
          accessToken: accessToken,
          refreshToken: newRefreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(400, "Something went wrong! please try again later...");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  // get old,new,confirm passwords from req.body
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // check whether confirm pass=new passs
  if (!(newPassword === confirmPassword)) {
    throw new ApiError(
      400,
      "new password and confirm passwords are not matched!"
    );
  }

  try {
    // get user from req.user
    const user = await User.findById(req?.user?._id);
    if (!user) {
      throw new ApiError(400, "User not found!");
    }

    // verify password of old password
    const isPassCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPassCorrect) {
      throw new ApiError(400, "Your old password is incorrect");
    }

    user.password = newPassword;
    await user.save({
      validateBeforeSave: false,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Successfully changed password!"));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "User fetch sucessfull!", req.user));
});

const updateTextProfile = asyncHandler(async (req, res) => {
  // get detail from user
  const { username, email, fullName } = req?.body;
  // get current user
  const user = req?.user;
  if (!user) {
    throw new ApiError(500, "Something went wrong on our side!");
  }
  try {
    // fetch user data from db
    const newUserData = await User.findByIdAndUpdate(
      user?._id,
      {
        $set: {
          username: username,
          email: email,
          fullName: fullName,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -refreshToken");
    return res
      .status(200)
      .json(new ApiResponse(200, "Update successfull", newUserData));
  } catch (error) {
    throw new ApiError(400, "User with same credentials already exists!");
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // get avatar file
  const avatarLocalPath = req?.files?.avatar[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Please reupload avatar file!");
  }

  // upload avatar to cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(
      400,
      "Avatar file not uploaded to cloud! Try again later..."
    );
  }

  // find and update avatar
  try {
    const user = await User.findByIdAndUpdate(
      req?.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      {
        new: true,
      }
    ).select("-password");

    // return the corrected user
    return res
      .status(200)
      .json(new ApiResponse(200, "Successfully updated user avatar!", user));
  } catch (error) {
    throw new ApiError(500, "we're unable to fetch your info! try again later");
  }
});

export {
  registerUser,
  userLogin,
  userLogout,
  refreshTokenHandle,
  changePassword,
  getCurrentUser,
  updateTextProfile,
  updateUserAvatar,
};
