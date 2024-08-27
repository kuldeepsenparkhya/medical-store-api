const mongoose = require("mongoose")
const bcrypt = require("bcrypt");
const { Schema } = mongoose

const userSchema = Schema({
  name: {
    type: String,
  },
  mobile: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    index: true,
    unique: true // Unique index. If you specify `unique: true`
  },
  socialType: {
    type: String,
    enum: ['google', 'facebook'],
  },
  socialID: {
    type: String,
  },
  password: {
    type: String,
    minlength: [8, 'Must be at least 6 characters password'],
  },
  profile: {
    type: String,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  token: {
    type: String,
  },
},
  {
    timestamps: true
  })

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};


module.exports = mongoose.model("User", userSchema)