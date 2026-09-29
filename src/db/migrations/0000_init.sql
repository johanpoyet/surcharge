CREATE TABLE `body_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`measured_on` text NOT NULL,
	`weight_kg` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `body_weights_unique` ON `body_weights` (`user_id`,`measured_on`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`muscle` text NOT NULL,
	`equipment` text NOT NULL,
	`weight_step` real DEFAULT 2.5 NOT NULL,
	`photo_path` text,
	`photo_local_uri` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_user` ON `exercises` (`user_id`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`op` text NOT NULL,
	`created_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_row` ON `outbox` (`table_name`,`row_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`goal` text,
	`sessions_per_week` integer,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`default_rest_seconds` integer DEFAULT 120 NOT NULL,
	`reminders_enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`template_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_overrides_unique` ON `schedule_overrides` (`user_id`,`date`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `session_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_order` integer NOT NULL,
	`set_number` integer NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`difficulty` text,
	`completed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_sets_exercise` ON `session_sets` (`user_id`,`exercise_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `session_sets_session` ON `session_sets` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_started` ON `sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`table_name` text PRIMARY KEY NOT NULL,
	`last_pulled_at` text
);
--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`target_sets` integer DEFAULT 3 NOT NULL,
	`target_reps_min` integer,
	`target_reps_max` integer,
	`rest_seconds` integer DEFAULT 120 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `template_exercises_template` ON `template_exercises` (`template_id`);--> statement-breakpoint
CREATE TABLE `weekly_schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weekday` integer NOT NULL,
	`template_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_schedule_unique` ON `weekly_schedule` (`user_id`,`weekday`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_templates_user` ON `workout_templates` (`user_id`);