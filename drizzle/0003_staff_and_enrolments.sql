CREATE TABLE `assessment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`name` text NOT NULL,
	`weight` real NOT NULL,
	`out_of` real DEFAULT 100 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`released` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`offering_id` integer NOT NULL,
	`uni_id` text NOT NULL,
	`name` text NOT NULL,
	`grade` text,
	`target_mark` real,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_offering_uni` ON `enrolments` (`offering_id`,`uni_id`);--> statement-breakpoint
CREATE TABLE `marks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`enrolment_id` integer NOT NULL,
	`score` real NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `assessment_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`enrolment_id`) REFERENCES `enrolments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marks_item_enrolment` ON `marks` (`item_id`,`enrolment_id`);--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`convenor_id` integer NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`units` integer DEFAULT 6 NOT NULL,
	`year` integer NOT NULL,
	`term` text NOT NULL,
	FOREIGN KEY (`convenor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uni_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`password_hash` text NOT NULL,
	`target_gpa` real,
	`degree_units` integer DEFAULT 144 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_uni_id_unique` ON `users` (`uni_id`);