SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    uuid CHAR(36) NOT NULL,

    user_code VARCHAR(20) DEFAULT NULL,

    firebase_uid VARCHAR(128) DEFAULT NULL,

    mobile_country_code VARCHAR(10) NOT NULL,

    mobile_number VARCHAR(20) NOT NULL,

    full_name VARCHAR(150) NOT NULL,

    email VARCHAR(150) DEFAULT NULL,

    gender ENUM(
        'Male',
        'Female',
        'Other',
        'Prefer Not To Say'
    ) DEFAULT 'Prefer Not To Say',

    date_of_birth DATE DEFAULT NULL,

    profile_photo VARCHAR(500) DEFAULT NULL,

    country_id BIGINT UNSIGNED NOT NULL,

    state_id BIGINT UNSIGNED NOT NULL,

    city_id BIGINT UNSIGNED NOT NULL,

    preferred_language_id BIGINT UNSIGNED NOT NULL,

    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',

    device_type ENUM(
        'ANDROID',
        'IOS'
    ) NOT NULL,

    device_model VARCHAR(200) DEFAULT NULL,

    device_os VARCHAR(100) DEFAULT NULL,

    app_version VARCHAR(30) DEFAULT NULL,

    firebase_token VARCHAR(500) DEFAULT NULL,

    last_login_at DATETIME DEFAULT NULL,

    last_logout_at DATETIME DEFAULT NULL,

    email_verified TINYINT(1) NOT NULL DEFAULT 0,

    mobile_verified TINYINT(1) NOT NULL DEFAULT 1,

    profile_completed TINYINT(1) NOT NULL DEFAULT 0,

    notification_enabled TINYINT(1) NOT NULL DEFAULT 1,

    sound_enabled TINYINT(1) NOT NULL DEFAULT 1,

    vibration_enabled TINYINT(1) NOT NULL DEFAULT 1,

    dark_mode_enabled TINYINT(1) NOT NULL DEFAULT 0,

    account_status ENUM(
        'ACTIVE',
        'INACTIVE',
        'BLOCKED',
        'DELETED'
    ) NOT NULL DEFAULT 'ACTIVE',

    login_type ENUM(
        'PHONE'
    ) NOT NULL DEFAULT 'PHONE',

    role ENUM(
        'USER',
        'CLIENT',
        'ADMIN',
        'SUPER_ADMIN'
    ) NOT NULL DEFAULT 'USER',

    terms_accepted TINYINT(1) NOT NULL DEFAULT 0,

    privacy_policy_accepted TINYINT(1) NOT NULL DEFAULT 0,

    terms_accepted_at DATETIME DEFAULT NULL,

    privacy_policy_accepted_at DATETIME DEFAULT NULL,

    failed_login_attempts INT NOT NULL DEFAULT 0,

    account_locked_until DATETIME DEFAULT NULL,

    password_last_changed_at DATETIME DEFAULT NULL,

    last_password_reset_at DATETIME DEFAULT NULL,

    created_by BIGINT UNSIGNED DEFAULT NULL,

    updated_by BIGINT UNSIGNED DEFAULT NULL,

    deleted_by BIGINT UNSIGNED DEFAULT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    deleted_at TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (id),

    UNIQUE KEY uk_users_uuid (uuid),

    UNIQUE KEY uk_users_user_code (user_code),

    UNIQUE KEY uk_users_firebase_uid (firebase_uid),

    UNIQUE KEY uk_users_mobile (
        mobile_country_code,
        mobile_number
    ),

    UNIQUE KEY uk_users_email (email),

    INDEX idx_users_full_name (
        full_name
    ),

    INDEX idx_users_country (
        country_id
    ),

    INDEX idx_users_state (
        state_id
    ),

    INDEX idx_users_city (
        city_id
    ),

    INDEX idx_users_language (
        preferred_language_id
    ),

    INDEX idx_users_status (
        account_status
    ),

    INDEX idx_users_role (
        role
    ),

    INDEX idx_users_created (
        created_at
    ),

    INDEX idx_users_last_login (
        last_login_at
    ),

    INDEX idx_users_profile_completed (
        profile_completed
    ),

    INDEX idx_users_mobile_verified (
        mobile_verified
    ),

    INDEX idx_users_notification (
        notification_enabled
    ),

    INDEX idx_users_deleted (
        deleted_at
    ),
INDEX idx_users_firebase_token (firebase_token),
    CONSTRAINT fk_users_country
        FOREIGN KEY (country_id)
        REFERENCES countries(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_state
        FOREIGN KEY (state_id)
        REFERENCES states(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_city
        FOREIGN KEY (city_id)
        REFERENCES cities(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_language
        FOREIGN KEY (preferred_language_id)
        REFERENCES languages(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_users_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_users_deleted_by
        FOREIGN KEY (deleted_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
DELIMITER $$

DROP TRIGGER IF EXISTS trg_users_before_insert$$

CREATE TRIGGER trg_users_before_insert
BEFORE INSERT
ON users
FOR EACH ROW
BEGIN

    IF NEW.uuid IS NULL OR NEW.uuid = '' THEN
        SET NEW.uuid = UUID();
    END IF;

    SET NEW.mobile_number = TRIM(NEW.mobile_number);
    SET NEW.mobile_country_code = TRIM(NEW.mobile_country_code);
    SET NEW.full_name = TRIM(NEW.full_name);

    IF NEW.email IS NOT NULL THEN
        SET NEW.email = LOWER(TRIM(NEW.email));
    END IF;

    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = CURRENT_TIMESTAMP;
    END IF;

    SET NEW.updated_at = CURRENT_TIMESTAMP;

END$$

DROP TRIGGER IF EXISTS trg_users_before_update$$

CREATE TRIGGER trg_users_before_update
BEFORE UPDATE
ON users
FOR EACH ROW
BEGIN

    SET NEW.mobile_number = TRIM(NEW.mobile_number);
    SET NEW.mobile_country_code = TRIM(NEW.mobile_country_code);
    SET NEW.full_name = TRIM(NEW.full_name);

    IF NEW.email IS NOT NULL THEN
        SET NEW.email = LOWER(TRIM(NEW.email));
    END IF;

    SET NEW.updated_at = CURRENT_TIMESTAMP;

END$$

DELIMITER ;

CREATE INDEX idx_users_search_name
ON users(full_name);

CREATE INDEX idx_users_search_mobile
ON users(mobile_country_code, mobile_number);

CREATE INDEX idx_users_search_email
ON users(email);

CREATE INDEX idx_users_country_state
ON users(country_id, state_id);

CREATE INDEX idx_users_country_state_city
ON users(country_id, state_id, city_id);

CREATE INDEX idx_users_status_role
ON users(account_status, role);

CREATE INDEX idx_users_language_status
ON users(preferred_language_id, account_status);

CREATE INDEX idx_users_profile_status
ON users(profile_completed, account_status);

CREATE INDEX idx_users_created_status
ON users(created_at, account_status);

CREATE INDEX idx_users_login_status
ON users(last_login_at, account_status);
DROP VIEW IF EXISTS vw_active_users;

CREATE VIEW vw_active_users AS
SELECT
    u.id,
    u.uuid,
    u.full_name,
    u.mobile_country_code,
    u.mobile_number,
    u.email,
    u.gender,
    u.date_of_birth,
    u.profile_photo,
    c.name AS country_name,
    s.name AS state_name,
    ci.name AS city_name,
    l.name AS language_name,
    u.account_status,
    u.role,
    u.profile_completed,
    u.mobile_verified,
    u.email_verified,
    u.notification_enabled,
    u.last_login_at,
    u.created_at
FROM users u
INNER JOIN countries c
    ON c.id = u.country_id
INNER JOIN states s
    ON s.id = u.state_id
INNER JOIN cities ci
    ON ci.id = u.city_id
INNER JOIN languages l
    ON l.id = u.preferred_language_id
WHERE u.deleted_at IS NULL
AND u.account_status = 'ACTIVE';

DROP VIEW IF EXISTS vw_user_location;

CREATE VIEW vw_user_location AS
SELECT
    u.id,
    u.full_name,
    c.name AS country,
    s.name AS state,
    ci.name AS city
FROM users u
INNER JOIN countries c
    ON c.id = u.country_id
INNER JOIN states s
    ON s.id = u.state_id
INNER JOIN cities ci
    ON ci.id = u.city_id
WHERE u.deleted_at IS NULL;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_soft_delete_user $$

CREATE PROCEDURE sp_soft_delete_user(
    IN p_user_id BIGINT UNSIGNED,
    IN p_deleted_by BIGINT UNSIGNED
)
BEGIN

    UPDATE users
    SET
        account_status = 'DELETED',
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = p_deleted_by
    WHERE id = p_user_id;

END $$

DROP PROCEDURE IF EXISTS sp_activate_user $$

CREATE PROCEDURE sp_activate_user(
    IN p_user_id BIGINT UNSIGNED
)
BEGIN

    UPDATE users
    SET
        account_status = 'ACTIVE',
        deleted_at = NULL,
        deleted_by = NULL
    WHERE id = p_user_id;

END $$

DELIMITER ;
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_update_last_login $$

CREATE PROCEDURE sp_update_last_login(
    IN p_user_id BIGINT UNSIGNED,
    IN p_firebase_token VARCHAR(500),
    IN p_device_type ENUM('ANDROID','IOS','WEB'),
    IN p_device_model VARCHAR(200),
    IN p_device_os VARCHAR(100),
    IN p_app_version VARCHAR(30)
)
BEGIN

    UPDATE users
    SET
        firebase_token = p_firebase_token,
        device_type = p_device_type,
        device_model = p_device_model,
        device_os = p_device_os,
        app_version = p_app_version,
        last_login_at = CURRENT_TIMESTAMP,
        failed_login_attempts = 0,
        account_locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

END $$

DROP PROCEDURE IF EXISTS sp_update_last_logout $$

CREATE PROCEDURE sp_update_last_logout(
    IN p_user_id BIGINT UNSIGNED
)
BEGIN

    UPDATE users
    SET
        last_logout_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

END $$

DROP PROCEDURE IF EXISTS sp_block_user $$

CREATE PROCEDURE sp_block_user(
    IN p_user_id BIGINT UNSIGNED
)
BEGIN

    UPDATE users
    SET
        account_status = 'BLOCKED',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

END $$

DROP PROCEDURE IF EXISTS sp_unblock_user $$

CREATE PROCEDURE sp_unblock_user(
    IN p_user_id BIGINT UNSIGNED
)
BEGIN

    UPDATE users
    SET
        account_status = 'ACTIVE',
        failed_login_attempts = 0,
        account_locked_until = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

END $$

DELIMITER ;

CREATE OR REPLACE VIEW vw_user_summary AS
SELECT
    id,
    uuid,
    full_name,
    mobile_country_code,
    mobile_number,
    email,
    role,
    account_status,
    profile_completed,
    mobile_verified,
    email_verified,
    last_login_at,
    created_at
FROM users
WHERE deleted_at IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
