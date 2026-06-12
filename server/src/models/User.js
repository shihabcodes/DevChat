const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: function () {
            return !this.googleId;
        },
        minlength: 8,
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
    },
    avatar: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['developer', 'lead', 'admin', 'guest'],
        default: 'developer',
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away'],
        default: 'offline',
    },
    openaiKeyEnc: {
        type: String,
        default: null,
        select: false,
    },
    openaiKeyMask: {
        type: String,
        default: null,
    },
    openaiKeySetAt: {
        type: Date,
        default: null,
    },
    expiresAt: {
        type: Date,
        default: null,
        index: { expires: 0 },
    },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.openaiKeyEnc;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
