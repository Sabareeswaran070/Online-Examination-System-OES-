const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'depthead', 'faculty', 'student'],
      default: 'student',
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    profileImage: {
      type: String,
    },
    phone: {
      type: String,
    },
    regNo: {
      type: String,
      sparse: true, // Registration Number for students
    },
    enrollmentNumber: {
      type: String,
      sparse: true, // Only for students
    },
    employeeId: {
      type: String,
      sparse: true, // Only for faculty/staff
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = Date.now();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
