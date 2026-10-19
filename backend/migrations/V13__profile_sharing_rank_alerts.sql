-- Profiles stay private until students explicitly enable sharing.
ALTER TABLE `user`
    ADD COLUMN profile_share_token VARCHAR(36) NULL,
    ADD COLUMN last_seen_rank INT NULL,
    ADD UNIQUE KEY uk_user_profile_share_token (profile_share_token);
