const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Image || mongoose.model("Image", imageSchema);
