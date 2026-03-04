CREATE TABLE `canva_designs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`designId` varchar(100) NOT NULL,
	`designType` varchar(50),
	`editUrl` text,
	`viewUrl` text,
	`thumbnailUrl` text,
	`pdfDownloadUrl` text,
	`pngDownloadUrl` text,
	`pptxDownloadUrl` text,
	`exportStatus` enum('pending','exporting','ready','error') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `canva_designs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` int NOT NULL,
	`playerName` varchar(100),
	`score` int NOT NULL,
	`maxScore` int NOT NULL,
	`timeSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('quiz','memory','matching','fill_blanks','spelling_bee','sentence_scramble') NOT NULL,
	`title` text,
	`config` json NOT NULL,
	`shareToken` varchar(32) NOT NULL,
	`plays` int DEFAULT 0,
	`isPublic` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_shareToken_unique` UNIQUE(`shareToken`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`type` enum('worksheet','vocabulary_list','flashcards','grammar_guide','writing_exercise','listening_comprehension','lesson_plan','mini_textbook','discussion_questions','homework','teacher_notes','song_worksheet') NOT NULL,
	`title` text,
	`content` json,
	`canvaDesignId` varchar(100),
	`canvaEditUrl` text,
	`canvaViewUrl` text,
	`pdfUrl` text,
	`pngUrl` text,
	`pptxUrl` text,
	`status` enum('pending','generating','designing','completed','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`youtubeUrl` text NOT NULL,
	`youtubeId` varchar(20),
	`title` text,
	`description` text,
	`thumbnailUrl` text,
	`duration` int,
	`transcript` text,
	`language` varchar(10) DEFAULT 'en',
	`cefrLevel` varchar(5),
	`topics` json,
	`status` enum('pending','transcribing','analyzing','generating','completed','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vocabulary_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`word` varchar(100) NOT NULL,
	`partOfSpeech` varchar(30),
	`definition` text,
	`exampleSentence` text,
	`polishTranslation` varchar(200),
	`cefrLevel` varchar(5),
	`audioUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vocabulary_items_id` PRIMARY KEY(`id`)
);
