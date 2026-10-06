CREATE TABLE `session_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`template_block_id` text,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`name` text,
	`config` text DEFAULT '{}' NOT NULL,
	`result` text DEFAULT '{}' NOT NULL,
	`started_at` text,
	`ended_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_blocks_session` ON `session_blocks` (`session_id`);--> statement-breakpoint
CREATE TABLE `template_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`name` text,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `template_blocks_template` ON `template_blocks` (`template_id`);--> statement-breakpoint
ALTER TABLE `exercises` ADD `tracking_type` text DEFAULT 'weight_reps' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises` ADD `discipline` text DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises` ADD `catalog_key` text;--> statement-breakpoint
CREATE INDEX `exercises_catalog_key` ON `exercises` (`user_id`,`catalog_key`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `disciplines` text DEFAULT '["strength"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `block_id` text;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `distance_m` integer;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `duration_s` integer;--> statement-breakpoint
ALTER TABLE `session_sets` ADD `calories` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `block_id` text;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `target_distance_m` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `target_duration_s` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `target_calories` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `target_weight_kg` real;