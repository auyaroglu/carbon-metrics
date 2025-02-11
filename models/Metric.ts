import mongoose from 'mongoose';

const MetricSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true
  },
  cls: {
    type: Number,
    required: true
  },
  lcp: {
    type: Number,
    required: true
  },
  inp: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
});

export default mongoose.models.Metric || mongoose.model('Metric', MetricSchema); 