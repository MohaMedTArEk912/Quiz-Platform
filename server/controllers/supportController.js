import { SupportTicket } from '../models/SupportTicket.js';
import { sendSupportEmail } from '../services/emailService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_CATEGORIES = ['technical', 'bug', 'scoring', 'account', 'feature', 'general'];

/**
 * Handles incoming support ticket submissions
 * POST /api/support
 */
export async function createSupportTicket(req, res) {
  try {
    const { email, name, subject, message, category } = req.body || {};

    // 1. Validation
    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const trimmedSubject = String(subject || '').trim();
    if (!trimmedSubject || trimmedSubject.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be at least 3 characters long.'
      });
    }

    const trimmedMessage = String(message || '').trim();
    if (!trimmedMessage || trimmedMessage.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Message description must be at least 5 characters long.'
      });
    }

    const normalizedCategory = ALLOWED_CATEGORIES.includes(String(category).toLowerCase())
      ? String(category).toLowerCase()
      : 'general';

    // Extract logged in user ID if available
    const userId = req.user?.id || req.user?.userId || req.headers['x-user-id'] || null;

    // Generate readable, unique ticket reference ID
    const ticketId = `TK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 2. Persist ticket in database
    let ticket = null;
    try {
      ticket = await SupportTicket.create({
        ticketId,
        email: email.trim().toLowerCase(),
        name: name ? String(name).trim() : '',
        subject: trimmedSubject,
        category: normalizedCategory,
        message: trimmedMessage,
        userId: userId ? String(userId) : null,
        status: 'open',
        emailDeliveryStatus: 'simulated'
      });
    } catch (dbErr) {
      console.error('⚠️ [SupportController] Could not save ticket to DB:', dbErr.message);
      // Even if DB fails temporarily, proceed to send the email so the user request is not lost
    }

    // 3. Dispatch real email
    const emailResult = await sendSupportEmail({
      ticketId,
      email: email.trim().toLowerCase(),
      name: name ? String(name).trim() : '',
      subject: trimmedSubject,
      category: normalizedCategory,
      message: trimmedMessage,
      userId
    });

    // 4. Update ticket in DB with email delivery result if DB record exists
    if (ticket) {
      try {
        ticket.emailDeliveryStatus = emailResult.status;
        ticket.emailDeliveryMessageId = emailResult.messageId || '';
        ticket.emailDeliveryError = emailResult.error || '';
        ticket.previewUrl = emailResult.previewUrl || '';
        await ticket.save();
      } catch (updateErr) {
        console.warn('⚠️ [SupportController] Failed to update ticket delivery status:', updateErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Your support ticket has been received! Our team will contact you shortly.',
      ticketId,
      deliveryStatus: emailResult.status,
      previewUrl: emailResult.previewUrl || undefined
    });
  } catch (error) {
    console.error('❌ [SupportController] Unexpected error in createSupportTicket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit support ticket. Please try again or email mohaamedtariq12@gmail.com directly.'
    });
  }
}

/**
 * Optional: Get support tickets for the current authenticated user
 * GET /api/support/my-tickets
 */
export async function getUserTickets(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId || req.headers['x-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-emailDeliveryError');

    return res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('❌ [SupportController] Error in getUserTickets:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
}
