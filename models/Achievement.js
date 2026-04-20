const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Achievement || mongoose.model("Achievement", achievementSchema);
