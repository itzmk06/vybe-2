import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken=async (userId)=>{
    const user=await User.findById(userId);
    const refreshToken=await user.generateRefreshToken();
    const accessToken=await user.generateAccessToken();

    // update refresh token of user 
    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false})

    return {refreshToken,accessToken};
}

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

const userLogin=asyncHandler(async(req,res)=>{
  // get the detail from user
  const {username,email,password}=req.body;

  // if those primary details are not given throw error
  if(!username&&!email){
    throw new ApiError(400,"Please enter either username or email!");
  }

  // find user from db based on username or email recieved
  const user=await User.findOne({
    $or:[{username},{email}],
  })

  // if user with provided fields not present throw error 
  if(!user){
    throw new ApiError(400,"user not found!");
  }

  // check whether password is correct 
  const isPasswordCorrect=await user.isPasswordCorrect(password);
  if(!isPasswordCorrect){
    throw new ApiError(400,"password is incorrect!");
  }

  //generate access and refresh token
  const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);

  // send data  in cookies 
  const loggedUser=await User.findById(user._id).select(
    "-password -refreshToken"
  )
  const option={
    httpOnly:true,
    secure:true
  }

  return res.status(200)
    .cookie("accessToken",accessToken,option)
    .cookie("refreshToken",refreshToken,option)
    .json(
      new ApiResponse(
        200,
        "User logged in successfully!",
        {
          user:loggedUser,
          accessToken:accessToken,
          refreshToken:refreshToken,
        }
      )
    )
});

const userLogout=asyncHandler(async(req,res)=>{
  User.findByIdAndUpdate(
      req.body._id,
      {
        $set:{
          refreshToken:undefined
        }
      },
      {
        new:true
      }
  )
  const options={
    httpOnly:true,
    secure:true
  }
  res.status(201)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
      new ApiResponse(
        200,
        {},
        "User logged out successfully!"
      )
    )
});


export { registerUser,userLogin,userLogout };
