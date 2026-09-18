SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS notifications (

    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    notification_type ENUM(
        'GENERAL',
        'JAPA_REMINDER',
        'GOAL_COMPLETED',
        'MONTHLY_DONATION',
        'FESTIVAL',
        'BIRTHDAY',
        'ANNIVERSARY',
        'FAMILY_INVITATION',
        'FAMILY_JOINED',
        'FAMILY_PROGRESS',
        'REWARD',
        'SYSTEM'
    ) NOT NULL DEFAULT 'GENERAL',

    action_type VARCHAR(100) DEFAULT NULL,

    action_id BIGINT UNSIGNED DEFAULT NULL,

    extra_data JSON DEFAULT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    read_at DATETIME DEFAULT NULL,

    expires_at DATETIME DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_user (user_id),
    INDEX idx_type (notification_type),
    INDEX idx_read (is_read),
    INDEX idx_sent (sent_at),
    INDEX idx_action (action_type)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;