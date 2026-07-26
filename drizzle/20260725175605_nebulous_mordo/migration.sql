CREATE TABLE `analytics` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`urlId` int,
	`times` timestamp DEFAULT (now()),
	`ipAddress` varchar(255) NOT NULL,
	`country` varchar(255) NOT NULL,
	`browser` varchar(255) NOT NULL,
	`device` varchar(255) NOT NULL,
	`referrer` varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `urls` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`url` text NOT NULL,
	`short` varchar(255),
	`personal` tinyint DEFAULT 0,
	`live` timestamp,
	`status` tinyint DEFAULT 1,
	CONSTRAINT `short_unique` UNIQUE INDEX(`short`)
);
--> statement-breakpoint
ALTER TABLE `analytics` ADD CONSTRAINT `analytics_urlId_urls_id_fkey` FOREIGN KEY (`urlId`) REFERENCES `urls`(`id`) ON DELETE CASCADE;