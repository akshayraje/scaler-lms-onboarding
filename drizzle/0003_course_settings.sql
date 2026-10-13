CREATE TABLE "course_settings" (
	"course_id" text PRIMARY KEY NOT NULL,
	"coverage" jsonb NOT NULL,
	"nudges" jsonb NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_settings" ADD CONSTRAINT "course_settings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;