import { NewsletterSubscriber } from '../models/NewsletterSubscriber.js';
import { sendWeeklyChallengeWelcomeEmail, sendChallengeDropBroadcastEmail } from '../services/emailService.js';
import { User } from '../models/User.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Check if current user or email is subscribed to weekly challenges
 * GET /api/newsletter/status
 */
export async function getSubscriptionStatus(req, res) {
  try {
    const userId = req.user?.id || req.user?.userId || null;
    const emailParam = req.query?.email ? String(req.query.email).trim().toLowerCase() : null;

    const queries = [];
    if (userId) queries.push({ userId });
    if (emailParam && EMAIL_REGEX.test(emailParam)) queries.push({ email: emailParam });

    if (queries.length === 0) {
      return res.json({ subscribed: false });
    }

    const subscriber = await NewsletterSubscriber.findOne({
      $or: queries,
      status: 'active'
    }).lean();

    if (subscriber) {
      return res.json({
        subscribed: true,
        email: subscriber.email,
        name: subscriber.name,
        subscribedAt: subscriber.subscribedAt
      });
    }

    return res.json({ subscribed: false });
  } catch (err) {
    console.error('Error checking newsletter status:', err);
    return res.json({ subscribed: false });
  }
}

/**
 * Subscribe email to Weekly Challenges & Learning Tracks updates
 * POST /api/newsletter/subscribe
 */
export async function subscribe(req, res) {
  try {
    const { email, name } = req.body || {};

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userId = req.user?.id || req.user?.userId || req.body?.userId || null;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

    // Check if user exists to extract their name if not provided
    let subscriberName = name ? String(name).trim() : '';
    if (!subscriberName && userId) {
      try {
        const foundUser = await User.findOne({ userId }).select('name').lean();
        if (foundUser?.name) {
          subscriberName = foundUser.name;
        }
      } catch {
        // Ignore user lookup failure
      }
    }

    let subscriber = await NewsletterSubscriber.findOne({ email: normalizedEmail });

    if (subscriber) {
      if (subscriber.status === 'active') {
        return res.status(200).json({
          success: true,
          alreadySubscribed: true,
          message: "You're already subscribed to Weekly Challenges updates!"
        });
      }

      // Reactivate previously unsubscribed email
      subscriber.status = 'active';
      subscriber.subscribedAt = new Date();
      if (userId) subscriber.userId = userId;
      if (subscriberName) subscriber.name = subscriberName;
      await subscriber.save();

      // Send welcome email asynchronously
      sendWeeklyChallengeWelcomeEmail({
        email: normalizedEmail,
        name: subscriber.name,
        unsubscribeToken: subscriber.unsubscribeToken
      }).catch(err => console.error('⚠️ [Newsletter] Failed to dispatch welcome email:', err.message));

      return res.status(200).json({
        success: true,
        message: "🎉 Welcome back! Your subscription has been reactivated. Check your inbox!"
      });
    }

    // Create new subscriber
    subscriber = await NewsletterSubscriber.create({
      email: normalizedEmail,
      userId,
      name: subscriberName,
      source: 'footer_weekly_challenges',
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null
    });

    // Send confirmation welcome email
    sendWeeklyChallengeWelcomeEmail({
      email: normalizedEmail,
      name: subscriberName,
      unsubscribeToken: subscriber.unsubscribeToken
    }).catch(err => console.error('⚠️ [Newsletter] Failed to dispatch welcome email:', err.message));

    return res.status(201).json({
      success: true,
      message: "🎉 You're in! Check your inbox for challenge updates and algorithmic drops."
    });
  } catch (error) {
    console.error('❌ [NewsletterController] Subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process subscription. Please try again shortly.'
    });
  }
}

/**
 * Unsubscribe an email address
 * GET /api/newsletter/unsubscribe?email=...&token=...
 * POST /api/newsletter/unsubscribe
 */
export async function unsubscribe(req, res) {
  try {
    const email = req.query.email || req.body.email;
    const token = req.query.token || req.body.token;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const query = { email: normalizedEmail };
    if (token) {
      query.unsubscribeToken = token;
    }

    const subscriber = await NewsletterSubscriber.findOne(query);

    if (!subscriber) {
      if (req.method === 'GET') {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
              <h2>Subscriber Not Found</h2>
              <p>The requested email (${normalizedEmail}) was not found or is already unsubscribed.</p>
              <a href="/" style="display:inline-block; margin-top: 16px; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 8px;">Back to Quiz Platform</a>
            </body>
          </html>
        `);
      }
      return res.status(404).json({
        success: false,
        message: 'Subscriber record not found.'
      });
    }

    subscriber.status = 'unsubscribed';
    await subscriber.save();

    if (req.method === 'GET') {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribed Successfully</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; text-align: center;">
            <div style="max-width: 480px; margin: 0 auto; background: #fff; border: 2.5px solid #000; border-radius: 16px; box-shadow: 5px 5px 0px #000; padding: 32px;">
              <h2 style="margin-top: 0; font-size: 22px;">You've Been Unsubscribed</h2>
              <p>You will no longer receive weekly challenge drop notifications for <strong>${normalizedEmail}</strong>.</p>
              <p style="font-size: 13px; color: #64748b;">Changed your mind? You can re-subscribe at any time in the Quiz Platform footer.</p>
              <a href="/" style="display:inline-block; margin-top: 16px; padding: 12px 24px; background: #bef264; color: #000; text-decoration: none; font-weight: bold; border: 2px solid #000; border-radius: 10px;">Return to Platform</a>
            </div>
          </body>
        </html>
      `);
    }

    return res.status(200).json({
      success: true,
      message: 'You have been successfully unsubscribed from Weekly Challenges notifications.'
    });
  } catch (error) {
    console.error('❌ [NewsletterController] Unsubscribe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process unsubscribe request.'
    });
  }
}

/**
 * Get newsletter subscribers (Admin only)
 * GET /api/newsletter/subscribers
 */
export async function getSubscribers(req, res) {
  try {
    const totalSubscribers = await NewsletterSubscriber.countDocuments();
    const activeSubscribers = await NewsletterSubscriber.countDocuments({ status: 'active' });
    const subscribers = await NewsletterSubscriber.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      total: totalSubscribers,
      active: activeSubscribers,
      subscribers
    });
  } catch (error) {
    console.error('❌ [NewsletterController] getSubscribers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscribers.'
    });
  }
}

/**
 * Broadcast challenge drop alert to active subscribers (Admin only)
 * POST /api/newsletter/broadcast
 */
export async function broadcastChallengeDrop(req, res) {
  try {
    const { challengeTitle, challengeDescription, trackCategory, challengeUrl } = req.body || {};

    if (!challengeTitle) {
      return res.status(400).json({
        success: false,
        message: 'Challenge title is required.'
      });
    }

    const activeSubscribers = await NewsletterSubscriber.find({
      status: 'active',
      'preferences.weeklyChallenges': true
    }).select('email name unsubscribeToken').lean();

    if (!activeSubscribers.length) {
      return res.status(200).json({
        success: true,
        message: 'No active subscribers to notify.',
        sentCount: 0
      });
    }

    // Dispatch emails with staggered batching to avoid provider rate spikes
    let sentCount = 0;
    const batchSize = 10;
    for (let i = 0; i < activeSubscribers.length; i += batchSize) {
      const batch = activeSubscribers.slice(i, i + batchSize);
      await Promise.all(batch.map(async (sub) => {
        try {
          await sendChallengeDropBroadcastEmail({
            email: sub.email,
            name: sub.name,
            challengeTitle,
            challengeDescription,
            trackCategory,
            challengeUrl,
            unsubscribeToken: sub.unsubscribeToken
          });
          sentCount++;
        } catch (e) {
          console.error(`⚠️ Failed to send challenge broadcast to ${sub.email}:`, e.message);
        }
      }));
    }

    // Update lastNotifiedAt timestamp
    await NewsletterSubscriber.updateMany(
      { status: 'active' },
      { $set: { lastNotifiedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: `Challenge drop broadcast sent to ${sentCount} subscribers.`,
      sentCount
    });
  } catch (error) {
    console.error('❌ [NewsletterController] broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast challenge notification.'
    });
  }
}
