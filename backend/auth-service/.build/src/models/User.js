"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true, // No two users can have same Google ID
        index: true, // Create index for fast lookups
    },
    email: {
        type: String,
        required: true,
        lowercase: true, // Store emails in lowercase for consistency
        trim: true, // Remove whitespace
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    picture: {
        type: String,
        required: false,
    },
    refreshToken: {
        type: String,
        required: true,
        // Don't select by default (security - don't accidentally expose)
        select: false,
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
});
// Create index on email for fast lookups
UserSchema.index({ email: 1 });
// Create User model
// Mongoose will create a "users" collection (pluralizes "User")
const User = mongoose_1.default.model('User', UserSchema);
exports.default = User;
//# sourceMappingURL=User.js.map