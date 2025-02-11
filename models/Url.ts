import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      unique: true,
    },
    lastScanned: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Url = mongoose.models.Url || mongoose.model('Url', urlSchema);

export default Url; 