import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Url',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'failed'],
    default: 'pending'
  },
  error: {
    type: String
  },
  order: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

export default Job; 