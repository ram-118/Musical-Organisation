const mongoose = require("mongoose");

const collaborationSchema = new mongoose.Schema(
  {
    name: {
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

module.exports = mongoose.models.Collaboration || mongoose.model("Collaboration", collaborationSchema);
