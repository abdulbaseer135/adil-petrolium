import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../api/notificationApi';
import '../../styles/notifications.css';

/**
 * Helper to compute human-friendly relative time
 */
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

/**
 * FinTech Icon & Tag configuration per notification type
 */
const NOTIF_CONFIG = {
  new_pump_registration: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
        <path d="M13 10h4a2 2 0 0 1 2 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1" />
        <circle cx="8" cy="8" r="2" />
      </svg>
    ),
    tag: 'Pump Registration',
    boxClass: 'fintech-notif-icon-box--pump',
    tagClass: 'fintech-notif-tag--pump',
    route: '/super-admin/petrol-pumps',
  },
  customer_link_request: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    tag: 'Link Request',
    boxClass: 'fintech-notif-icon-box--link',
    tagClass: 'fintech-notif-tag--link',
    route: '/admin/customer-requests',
  },
  link_request_approved: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    tag: 'Approved',
    boxClass: 'fintech-notif-icon-box--approved',
    tagClass: 'fintech-notif-tag--approved',
    route: '/dashboard',
  },
  link_request_rejected: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    tag: 'Declined',
    boxClass: 'fintech-notif-icon-box--rejected',
    tagClass: 'fintech-notif-tag--rejected',
    route: '/dashboard',
  },
  ledger_entry: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    tag: 'Ledger Entry',
    boxClass: 'fintech-notif-icon-box--ledger',
    tagClass: 'fintech-notif-tag--ledger',
    route: '/dashboard/statement',
  },
};

/**
 * Universal FinTech Notification Bell Component
 * @param {Object} props
 * @param {'light'|'dark'} [props.variant='light'] - Theme variant for bell button
 * @param {string} [props.className] - Additional classes for button
 * @param {string} [props.title] - Tooltip text
 */
export default function NotificationBell({ variant = 'light', className = '', title = 'Notifications' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Fetch dynamic unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadCount();
      const count = res?.unreadCount ?? res?.count ?? 0;
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch (err) {
      // Silently fail on polling errors to avoid noisy console
    }
  }, []);

  // Fetch recent notifications list when opening dropdown
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications(1, 15);
      const list = res?.notifications || [];
      setNotifications(list);
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and 30-second interval polling
  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Handle open / close dropdown
  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleItemClick = async (notif) => {
    const config = NOTIF_CONFIG[notif.type] || {};

    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item._id === notif._id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await markAsRead(notif._id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);

    // Navigate to target route if configured
    if (config.route) {
      navigate(config.route);
    }
  };

  // Mark all as read
  const handleMarkAll = async (e) => {
    e.stopPropagation();
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    // Optimistic UI update
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Re-fetch count if error
      refreshUnreadCount();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="fintech-notif-wrapper" ref={containerRef}>
      <button
        type="button"
        onClick={handleToggle}
        className={`fintech-bell-btn ${isOpen ? 'is-open' : ''} ${className}`}
        title={title}
        aria-label={`${title} (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="fintech-notif-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fintech-notif-dropdown" role="dialog" aria-label="Notifications panel">
          {/* Header */}
          <div className="fintech-notif-header">
            <div className="fintech-notif-header-left">
              <span className="fintech-notif-header-title">Notifications</span>
              {unreadCount > 0 ? (
                <span className="fintech-notif-unread-pill">{unreadCount} new</span>
              ) : (
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Up to date</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="fintech-notif-markall-btn"
              >
                {markingAll ? 'Updating...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="fintech-notif-list">
            {loading ? (
              <>
                <div className="fintech-notif-skeleton">
                  <div className="fintech-notif-skeleton-icon" />
                  <div className="fintech-notif-skeleton-text">
                    <div className="fintech-notif-skeleton-line" style={{ width: '60%' }} />
                    <div className="fintech-notif-skeleton-line" style={{ width: '90%' }} />
                  </div>
                </div>
                <div className="fintech-notif-skeleton">
                  <div className="fintech-notif-skeleton-icon" />
                  <div className="fintech-notif-skeleton-text">
                    <div className="fintech-notif-skeleton-line" style={{ width: '50%' }} />
                    <div className="fintech-notif-skeleton-line" style={{ width: '85%' }} />
                  </div>
                </div>
              </>
            ) : notifications.length === 0 ? (
              <div className="fintech-notif-empty">
                <div className="fintech-notif-empty-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="fintech-notif-empty-title">All caught up!</div>
                <div className="fintech-notif-empty-desc">
                  No notifications to display right now. Real-time station activity will appear here.
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const config = NOTIF_CONFIG[notif.type] || {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ),
                  tag: 'Alert',
                  boxClass: 'fintech-notif-icon-box--link',
                  tagClass: 'fintech-notif-tag--link',
                  route: null,
                };

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    className={`fintech-notif-item ${!notif.isRead ? 'is-unread' : ''}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleItemClick(notif)}
                  >
                    <div className={`fintech-notif-icon-box ${config.boxClass}`}>
                      {config.icon}
                    </div>

                    <div className="fintech-notif-content">
                      <div className="fintech-notif-item-top">
                        <span className="fintech-notif-item-title">{notif.title}</span>
                        <span className="fintech-notif-time">{formatTimeAgo(notif.createdAt)}</span>
                      </div>
                      <div className="fintech-notif-item-msg">{notif.message}</div>
                      <span className={`fintech-notif-tag ${config.tagClass}`}>
                        {config.tag}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="fintech-notif-footer">
            <span className="fintech-notif-footer-text">
              Live updates active
            </span>
            <button
              type="button"
              onClick={loadNotifications}
              className="fintech-notif-footer-link"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
