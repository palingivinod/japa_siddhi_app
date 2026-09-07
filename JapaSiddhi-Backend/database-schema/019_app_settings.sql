SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS app_settings;

CREATE TABLE app_settings (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    setting_key VARCHAR(100) NOT NULL,

    setting_value TEXT DEFAULT NULL,

    setting_type ENUM(
        'TEXT',
        'NUMBER',
        'BOOLEAN',
        'EMAIL',
        'PHONE',
        'URL',
        'IMAGE'
    ) NOT NULL DEFAULT 'TEXT',

    category ENUM(
        'TRUST',
        'DONATION',
        'BANA_LINGAM',
        'APP',
        'NOTIFICATION',
        'SOCIAL',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',

    description VARCHAR(255) DEFAULT NULL,

    is_editable TINYINT(1) NOT NULL DEFAULT 1,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    updated_by BIGINT UNSIGNED DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uk_setting_key (setting_key),

    CONSTRAINT fk_app_settings_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    INDEX idx_category (category),
    INDEX idx_active (is_active)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

INSERT INTO app_settings
(setting_key, setting_value, setting_type, category, description)
VALUES

-- Trust Information
('trust_name', 'Bilva Patra Trust', 'TEXT', 'TRUST', 'Trust Name'),
('trust_address', '', 'TEXT', 'TRUST', 'Trust Address'),
('support_email', '', 'EMAIL', 'TRUST', 'Support Email'),
('support_phone', '', 'PHONE', 'TRUST', 'Support Phone'),
('support_whatsapp', '', 'PHONE', 'TRUST', 'WhatsApp Number'),
('website_url', '', 'URL', 'TRUST', 'Official Website'),

-- Donation
('monthly_donation_amount', '200', 'NUMBER', 'DONATION', 'Monthly Donation Amount'),
('upi_id', 'q007640149@ybl', 'TEXT', 'DONATION', 'UPI ID'),
('google_pay_number', '', 'PHONE', 'DONATION', 'Google Pay Number'),
('phonepe_number', '', 'PHONE', 'DONATION', 'PhonePe Number'),
('paytm_number', '', 'PHONE', 'DONATION', 'Paytm Number'),
('bank_name', '', 'TEXT', 'DONATION', 'Bank Name'),
('account_holder_name', '', 'TEXT', 'DONATION', 'Account Holder Name'),
('account_number', '', 'TEXT', 'DONATION', 'Bank Account Number'),
('ifsc_code', '', 'TEXT', 'DONATION', 'IFSC Code'),
('donation_qr_code', '', 'IMAGE', 'DONATION', 'Donation QR Code'),

-- Bana Lingam
('bana_lingam_enabled', '1', 'BOOLEAN', 'BANA_LINGAM', 'Enable Bana Lingam Requests'),
('bana_lingam_max_quantity', '1', 'NUMBER', 'BANA_LINGAM', 'Maximum Quantity'),
('bana_lingam_notes', '', 'TEXT', 'BANA_LINGAM', 'Instructions'),

-- App
('about_us', '', 'TEXT', 'APP', 'About Us'),
('privacy_policy_url', '', 'URL', 'APP', 'Privacy Policy'),
('terms_conditions_url', '', 'URL', 'APP', 'Terms & Conditions'),
('contact_us', '', 'TEXT', 'APP', 'Contact Us'),

-- Notifications
('daily_reminder_enabled', '1', 'BOOLEAN', 'NOTIFICATION', 'Enable Daily Reminder'),
('daily_reminder_time', '06:00', 'TEXT', 'NOTIFICATION', 'Reminder Time'),

-- Social Media
('facebook_url', '', 'URL', 'SOCIAL', 'Facebook'),
('instagram_url', '', 'URL', 'SOCIAL', 'Instagram'),
('youtube_url', '', 'URL', 'SOCIAL', 'YouTube'),
('telegram_url', '', 'URL', 'SOCIAL', 'Telegram'),
('twitter_url', '', 'URL', 'SOCIAL', 'X (Twitter)'),

-- App Controls
('maintenance_mode', '0', 'BOOLEAN', 'APP', 'Maintenance Mode'),
('latest_app_version', '1.0.0', 'TEXT', 'APP', 'Latest Version'),
('force_update', '0', 'BOOLEAN', 'APP', 'Force Update'),
('app_download_url', '', 'URL', 'APP', 'App Download URL'),
-- Home Screen
('home_banner_image', '', 'IMAGE', 'APP', 'Home Screen Banner Image'),
('home_banner_title', '', 'TEXT', 'APP', 'Home Screen Banner Title'),
('home_banner_description', '', 'TEXT', 'APP', 'Home Screen Banner Description'),
('home_banner_action', '', 'TEXT', 'APP', 'Home Screen Banner Action');

SET FOREIGN_KEY_CHECKS = 1;