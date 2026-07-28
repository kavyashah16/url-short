import {
  boolean,
  int,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const urls = mysqlTable("urls", {
  id: int().primaryKey().autoincrement(),
  url: text().notNull(),
  short: varchar({ length: 255 }).unique(),
  customAlias: tinyint().default(0),
  age: timestamp(),
  status: tinyint().default(1),
  password: varchar({ length: 255 }),
  isPass: tinyint().default(0),
  clickLimit: int(),
  isLimit: tinyint().default(0),
  clickCount: int().default(0),
});

export const analytics = mysqlTable("analytics", {
  id: int().primaryKey().autoincrement(),
  urlId: int().references(() => urls.id, { onDelete: "cascade" }),
  times: timestamp().defaultNow(),
  ipAddress: varchar({ length: 255 }).notNull(),
  country: varchar({ length: 255 }).notNull(),
  browser: varchar({ length: 255 }).notNull(),
  device: varchar({ length: 255 }).notNull(),
  referrer: varchar({ length: 255 }).notNull(),
});
