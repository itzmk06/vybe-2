import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

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
  if (
    !(
      req &&
      req?.files &&
      req?.files?.coverImage
    )
  ) {
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

export { registerUser };
