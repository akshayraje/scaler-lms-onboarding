CREATE TABLE "acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"course_version" integer NOT NULL,
	"statements" jsonb NOT NULL,
	"ip" text,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "certificates_user_course_version_uq";--> statement-breakpoint
ALTER TABLE "acknowledgements" ADD CONSTRAINT "acknowledgements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acknowledgements" ADD CONSTRAINT "acknowledgements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acknowledgements_user_course_idx" ON "acknowledgements" USING btree ("user_id","course_id","acknowledged_at");--> statement-breakpoint
CREATE INDEX "certificates_user_course_idx" ON "certificates" USING btree ("user_id","course_id","issued_at");