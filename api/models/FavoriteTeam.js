const mongoose = require("mongoose");

const favoriteTeamSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teamCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 5,
    },
    teamName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: true,
  }
);

favoriteTeamSchema.index({ userId: 1, teamCode: 1 }, { unique: true });

module.exports = mongoose.model("FavoriteTeam", favoriteTeamSchema);
