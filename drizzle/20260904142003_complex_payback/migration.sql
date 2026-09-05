CREATE TABLE `users` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`userName` varchar(255),
	`password` varchar(255) NOT NULL,
	CONSTRAINT `userName_unique` UNIQUE INDEX(`userName`)
);
--> statement-breakpoint
ALTER TABLE `urls` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `urls` ADD CONSTRAINT `urls_userId_users_id_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`);