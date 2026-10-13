import { ChannelStatus, HrmsStatus, NotificationsForm, Section, TestNotificationButton } from "@/components/admin/SettingsForms";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { getTemplates } from "@/lib/notifications/store";
import { hrmsConnection, slackConfig, smtpConfig } from "@/lib/automation/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · Admin" };

export default async function SettingsPage() {
  const [notifications, templates] = await Promise.all([getSettings("notifications"), getTemplates()]);
  const conn = hrmsConnection();
  const connection =
    conn.provider === "darwinbox"
      ? { label: `Darwinbox (${conn.baseUrl || "URL not set"})`, configured: !!(conn.baseUrl && conn.apiKey && conn.datasetKey) }
      : conn.provider === "mock"
        ? { label: "Mock data (HRMS_PROVIDER=mock)", configured: true }
        : { label: "None", configured: false };
  const smtp = smtpConfig();
  const slack = slackConfig();
  return (
    <>
      <Section title="Notifications" description="Controls whether training nudges are sent. Start with Dry run and review the log under Automation. Nudges go out on every configured provider below.">
        <NotificationsForm mode={notifications.mode} />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <ChannelStatus
            name="Slack"
            configured={!!slack}
            detail="Nudges are sent as direct messages from the bot, to the learner only (Slack has no CC)."
            envHint={<>Set <code>SLACK_BOT_TOKEN</code> on the server to enable.</>}
          />
          <ChannelStatus
            name="Email"
            configured={!!smtp}
            detail={smtp ? `Sending as ${smtp.fromName} <${smtp.fromEmail}> via ${smtp.host}:${smtp.port}. Managers are CC'd at escalation steps.` : ""}
            envHint={<>Set <code>SMTP_HOST</code> and <code>SMTP_FROM_EMAIL</code> (plus credentials) on the server to enable.</>}
          />
        </div>
        <div className="mt-4">
          <TestNotificationButton disabled={!smtp && !slack} />
        </div>
      </Section>
      <Section
        title="Notification templates"
        description="The same Markdown is used for email and Slack. Fields like {{full_name}} are filled in for each person."
      >
        <TemplateEditor initial={templates} />
      </Section>
      <Section title="HRMS" description="The employee master (joining dates, managers, leavers) is synced daily.">
        <HrmsStatus connection={connection} />
      </Section>
      <p className="text-xs text-muted-foreground">
        Credentials for Slack, email and Darwinbox are set as environment variables on the server, not here.
      </p>
    </>
  );
}
