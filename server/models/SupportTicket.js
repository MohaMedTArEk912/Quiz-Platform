import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  ticketId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    trim: true, 
    lowercase: true,
    index: true 
  },
  name: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  subject: { 
    type: String, 
    required: true, 
    trim: true 
  },
  category: { 
    type: String, 
    enum: ['technical', 'bug', 'scoring', 'account', 'feature', 'general'], 
    default: 'general',
    index: true 
  },
  message: { 
    type: String, 
    required: true, 
    trim: true 
  },
  userId: { 
    type: String, 
    default: null,
    index: true 
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'resolved', 'closed'], 
    default: 'open',
    index: true 
  },
  emailDeliveryStatus: { 
    type: String, 
    enum: ['sent', 'failed', 'simulated'], 
    default: 'simulated' 
  },
  emailDeliveryError: { 
    type: String, 
    default: '' 
  },
  emailDeliveryMessageId: { 
    type: String, 
    default: '' 
  },
  previewUrl: { 
    type: String, 
    default: '' 
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ createdAt: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
