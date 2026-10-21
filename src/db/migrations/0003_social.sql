ALTER TABLE `profiles` ADD `username` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `friend_code` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `share_sessions` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `share_records` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `share_exact_weights` integer DEFAULT false NOT NULL;