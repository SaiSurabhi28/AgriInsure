/**
 * Real-Time Notification Service
 * 
 * Sends alerts to farmers via multiple channels:
 * - Email (SendGrid/Mailgun)
 * - SMS (Twilio)
 * - Push Notifications (web socket)
 * - Browser Notifications
 */

class NotificationService {
  constructor() {
    this.enabled = true;
    this.emailEnabled = false; // Require API keys
    this.smsEnabled = false; // Require Twilio credentials
    this.pushEnabled = true; // Browser notifications
    
    // Initialize email service (placeholder)
    this.emailService = null;
    
    // Initialize SMS service (placeholder)
    this.smsService = null;
    
    // WebSocket connections for push notifications
    this.connections = new Map(); // farmerAddress -> Set of WebSocket connections
  }

  /**
   * Send notification via multiple channels
   * @param {Object} notification - Notification data
   */
  async sendNotification(notification) {
    if (!this.enabled) {
      console.log('Notifications disabled, skipping:', notification.type);
      return { success: false, reason: 'disabled' };
    }

    const results = {
      email: null,
      sms: null,
      push: null,
      browser: null
    };

    try {
      // Email notification
      if (notification.email && this.emailEnabled) {
        results.email = await this.sendEmail(notification);
      }

      // SMS notification
      if (notification.phone && this.smsEnabled) {
        results.sms = await this.sendSMS(notification);
      }

      // Push notification (WebSocket)
      if (notification.farmerAddress) {
        results.push = await this.sendPushNotification(notification);
      }

      // Browser notification (always enabled for demo)
      results.browser = await this.sendBrowserNotification(notification);

      return {
        success: true,
        channels: results
      };
    } catch (error) {
      console.error('Notification error:', error);
      return {
        success: false,
        error: error.message,
        channels: results
      };
    }
  }

  /**
   * Send email notification (placeholder for SendGrid/Mailgun)
   */
  async sendEmail(notification) {
    if (!this.emailEnabled) {
      return { sent: false, reason: 'Email service not configured' };
    }

    // TODO: Implement actual email sending
    console.log('📧 Would send email:', {
      to: notification.email,
      subject: notification.subject,
      body: notification.message
    });

    return { sent: true, method: 'email', timestamp: new Date().toISOString() };
  }

  /**
   * Send SMS notification (placeholder for Twilio)
   */
  async sendSMS(notification) {
    if (!this.smsEnabled) {
      return { sent: false, reason: 'SMS service not configured' };
    }

    // TODO: Implement actual SMS sending
    console.log('📱 Would send SMS:', {
      to: notification.phone,
      message: notification.message
    });

    return { sent: true, method: 'sms', timestamp: new Date().toISOString() };
  }

  /**
   * Send push notification via WebSocket
   */
  async sendPushNotification(notification) {
    if (!notification.farmerAddress) {
      return { sent: false, reason: 'No farmer address' };
    }

    const connections = this.connections.get(notification.farmerAddress.toLowerCase());
    
    if (!connections || connections.size === 0) {
      console.log('No WebSocket connections for farmer:', notification.farmerAddress);
      return { sent: false, reason: 'No active connections' };
    }

    // Send to all connections for this farmer
    let sentCount = 0;
    connections.forEach(ws => {
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          data: notification
        }));
        sentCount++;
      } catch (error) {
        console.error('WebSocket send error:', error);
      }
    });

    console.log(`📢 Push notification sent to ${sentCount} connections for ${notification.farmerAddress}`);

    return { sent: sentCount > 0, count: sentCount, method: 'websocket', timestamp: new Date().toISOString() };
  }

  /**
   * Send browser notification (for frontend consumption)
   */
  async sendBrowserNotification(notification) {
    // For demo purposes, this logs the notification
    // Frontend can subscribe via WebSocket to receive these
    console.log('🔔 Browser Notification:', {
      title: notification.title,
      message: notification.message,
      type: notification.type
    });

    return { sent: true, method: 'browser', timestamp: new Date().toISOString() };
  }

  /**
   * Notify farmer about policy payout eligibility
   */
  async notifyPayoutEligible(policyId, farmerAddress, compositeIndex, threshold) {
    const notification = {
      type: 'payout_eligible',
      title: '🎉 Your Policy is Eligible for Payout!',
      message: `Policy #${policyId}: Composite Index (${compositeIndex}) below threshold (${threshold}). Payout triggered!`,
      farmerAddress: farmerAddress,
      policyId: policyId,
      severity: 'high',
      priority: 'urgent',
      timestamp: new Date().toISOString()
    };

    return this.sendNotification(notification);
  }

  /**
   * Notify farmer about threshold warning
   */
  async notifyThresholdWarning(policyId, farmerAddress, compositeIndex, threshold) {
    const deficit = threshold - compositeIndex;
    const percentage = ((deficit / threshold) * 100).toFixed(1);
    
    const notification = {
      type: 'threshold_warning',
      title: '⚠️ Policy Approaching Payout Threshold',
      message: `Policy #${policyId}: Index at ${compositeIndex} (${percentage}% below threshold). Monitor closely!`,
      farmerAddress: farmerAddress,
      policyId: policyId,
      severity: 'medium',
      priority: 'high',
      timestamp: new Date().toISOString()
    };

    return this.sendNotification(notification);
  }

  /**
   * Notify farmer about policy creation
   */
  async notifyPolicyCreated(policyId, farmerAddress, premium, payout) {
    const notification = {
      type: 'policy_created',
      title: '✅ Policy Created Successfully',
      message: `Policy #${policyId} created! Premium: ${premium} ETH, Payout: ${payout} ETH`,
      farmerAddress: farmerAddress,
      policyId: policyId,
      severity: 'low',
      priority: 'normal',
      timestamp: new Date().toISOString()
    };

    return this.sendNotification(notification);
  }

  /**
   * Notify farmer about policy expiration
   */
  async notifyPolicyExpiring(policyId, farmerAddress, daysRemaining) {
    const notification = {
      type: 'policy_expiring',
      title: '⏰ Policy Expiring Soon',
      message: `Policy #${policyId} expires in ${daysRemaining} day(s). No payout conditions met.`,
      farmerAddress: farmerAddress,
      policyId: policyId,
      severity: 'low',
      priority: 'normal',
      timestamp: new Date().toISOString()
    };

    return this.sendNotification(notification);
  }

  /**
   * Notify farmer about extreme weather events
   */
  async notifyExtremeWeather(farmerAddress, weatherType, severity) {
    const icon = weatherType === 'drought' ? '🌵' : weatherType === 'flood' ? '🌊' : '⛈️';
    
    const notification = {
      type: 'extreme_weather',
      title: `${icon} Extreme Weather Alert`,
      message: `${severity} ${weatherType} conditions detected in your area`,
      farmerAddress: farmerAddress,
      severity: 'high',
      priority: 'urgent',
      timestamp: new Date().toISOString()
    };

    return this.sendNotification(notification);
  }

  /**
   * Register WebSocket connection for a farmer
   */
  registerConnection(farmerAddress, ws) {
    const key = farmerAddress.toLowerCase();
    
    if (!this.connections.has(key)) {
      this.connections.set(key, new Set());
    }
    
    this.connections.get(key).add(ws);
    
    console.log(`Registered WebSocket connection for ${farmerAddress}. Total: ${this.connections.get(key).size}`);
    
    // Handle disconnect
    ws.on('close', () => {
      const connections = this.connections.get(key);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          this.connections.delete(key);
        }
      }
      console.log(`WebSocket disconnected for ${farmerAddress}. Remaining: ${this.connections.get(key)?.size || 0}`);
    });
  }

  /**
   * Get active connections count
   */
  getActiveConnections() {
    let total = 0;
    this.connections.forEach(set => total += set.size);
    return total;
  }
}

module.exports = NotificationService;

