const jwt = require('jsonwebtoken')
const bcrypt = require("bcrypt");

const { JWT_EXPIRESIN, JWT_SECREATE } = require("../config/config")
const { User, UserWallet } = require("../modals")
const { handleError, handleResponse, getPagination } = require("../utils/helper")
const { registerUser, updateUser, changePassword } = require("./joiValidator/userJoiSchema")

exports.create = async (req, res) => {
    try {
        const { name, email, password, mobile, role } = req.body
        const { error } = registerUser.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const data = { name, email, password, mobile, role, isBlocked: false };
        const newUser = new User(data);

        await newUser.save();

        const token = jwt.sign({
            _id: newUser._id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
        }, JWT_SECREATE, { expiresIn: JWT_EXPIRESIN })

        const datad = { ...newUser._doc, token }

        const userWallet = new UserWallet({ user_id: newUser._id, coin: 0 })

        await userWallet.save();

        handleResponse(res, datad, 'User has been registered successfully.', 201)
    } catch (error) {
        if (error.code === 11000) {
            handleError('This email is already exists.', 400, res)

            return
        }
        handleError(error.message, 400, res)
    };
};


// exports.addUserByAdmin = async (req, res) => {
//     try {
//         const { name, email, password, mobile, role } = req.body
//         const { error } = registerUser.validate(req.body, { abortEarly: false })

//         if (error) {
//             handleError(error, 400, res)
//             return
//         }

//         const data = { name, email, password, mobile, role };
//         const newUser = new User(data);

//         await newUser.save();

//         const datad = { ...newUser._doc }

//         handleResponse(res, datad, 'User has been successfully created!', 201)
//     } catch (error) {
//         if (error.code === 11000) {
//             handleError('This email is already exists.', 400, res)

//             return
//         }
//         handleError(error.message, 400, res)
//     };
// };


exports.find = async (req, res) => {
    try {
        const { role, q, page = 1, limit = 10, sort } = req.query;
        const searchFilter = q ? {
            $or: [
                { name: { $regex: new RegExp(q, 'i') } },
                { email: { $regex: new RegExp(q, 'i') } },
                { mobile: { $regex: new RegExp(q, 'i') } },
            ]
        } : {};

        const users = await User.find({ ...searchFilter })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))


        const getUsers = users.filter((user) => user.role !== 'admin')

        const totalCount = await User.countDocuments()

        const getPaginationResult = await getPagination(req.query, getUsers, totalCount);

        handleResponse(res, getPaginationResult, 200)

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.findOne = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOne({ _id: id })
        if (!user) {
            handleError('Invailid user.', 400, res)
            return
        }
        handleResponse(res, user._doc, 200)
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.update = async (req, res) => {
    try {
        const { name, email, mobile } = req.body
        const { id } = req.params;

        const user = await User.findOne({ _id: id })
        if (!user) {
            handleError('Invailid user.', 400, res)
            return
        }

        const { error } = updateUser.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        const file = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : user.profile

        const data = { name, email, mobile, profile: file }
        await User.updateOne({ _id: id }, data, { new: true })
        res.status(200).send({ message: "User has been successfully update.", error: false })
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user._id === id || req.user.role === 'admin') {
            const user = await User.findOne({ _id: id })

            if (!user) {
                handleError('Invailid user.', 400, res)
                return
            }

            await User.deleteOne({ _id: user._id })

            handleResponse(res, 'User successfully removed.', 200)
        }
        else {
            handleError('User can delete self account or admin can delete user account.', 400, res)
            return
        }
    } catch (error) {
        handleError(error.message, 400, res)
    };
};

exports.getTotalUsers = async (req, res) => {
    try {
        const users = await User.find()
        const getuAllUsers = users.filter((user) => user.role !== 'admin');
        getuAllUsers?.length
        res.send(getuAllUsers)
    } catch (error) {
        res.send(error)
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const { name, email, mobile } = req.body

        const { error } = updateUser.validate(req.body, { abortEarly: false })
        if (error) {
            handleError(error, 400, res)
            return
        }

        const getUser = await User.findOne({ _id: req.user._id })

        const file = req?.file ? `${process.env.BASE_URL}/media/${req?.file?.filename}` : getUser.profile

        const data = { name, email, mobile, profile: file }
        await User.updateOne({ _id: req.user._id }, data, { new: true })

        res.status(200).send({ message: "User has been successfully update.", error: false })
    } catch (error) {
        handleError(error.message, 400, res)
    };
};


exports.changePassword = async (req, res) => {
    try {
        const { new_password, confirm_password, old_password } = req.body;
        // Validate input
        const { error } = changePassword.validate(req.body, { abortEarly: false })

        if (error) {
            handleError(error, 400, res)
            return
        }

        if (new_password !== confirm_password) {
            return res.status(400).send({ message: 'New password and confirm password do not match', error: true });
        }

        // Find the user
        const user = await User.findOne({ _id: req.user._id });
        if (!user) {
            return res.status(404).send({ message: 'User not found', error: true });
        }

        // Check if the old password is correct
        const matchedPassword = await user.matchPassword(old_password);
        if (!matchedPassword) {
            return res.status(401).send({ message: 'Old password is incorrect', error: true });
        }

        // Hash the new password
        const updatePassword = await bcrypt.hash(new_password, 10);

        await User.updateOne({ _id: user._id }, { password: updatePassword }, { new: true })
            .then(data => {
                return res.send({ message: 'You have successfully reset your password', error: false })
            })
            .catch(err => {
                handleError(err.message, 400, res);
                return
            })


    } catch (error) {
        handleError(error.message, 500, res); // Adjust status code as needed
    }
};


exports.blockedUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body
        const user = await User.findOne({ _id: id })
        if (!user) {
            handleError('Invailid user.', 400, res)
            return
        }

        await User.updateOne({ _id: id }, { isBlocked }, { new: true })
        if (isBlocked) {
            return res.status(200).send({ message: "User has been successfully blocked.", error: false })
        }
        return res.status(200).send({ message: "User has been successfully unblocked.", error: false })

    } catch (error) {
        handleError(error.message, 400, res)
    };
};


// Me get own profile
exports.me = async (req, res) => {
    const user = await User.findOne({ _id: req.user._id })
    const wallet = await UserWallet.findOne({ user_id: req.user._id });
    console.log('wallet>>>>>>', wallet);

    user.WalletBalance = wallet ? wallet?.coins : 0; // Set to 0 if no wallet found

    const userProfile = user.toObject(); // or use user._doc
    userProfile.walletBalance = user.WalletBalance;
    user === null ? handleError('Unauthorized user', 400, res) : handleResponse(res, userProfile, 'Retrieve your profile', 200)
}