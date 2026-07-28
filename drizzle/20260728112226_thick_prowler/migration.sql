ALTER TABLE `urls` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `urls` ADD `clickLimit` int;--> statement-breakpoint
ALTER TABLE `urls` ADD `clickCount` int DEFAULT 0;