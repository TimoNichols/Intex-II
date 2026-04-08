import AdminPageShell from '../../components/AdminPageShell';

export default function SocialPage() {
  return (
    <AdminPageShell
      title="Social media strategy"
      description="Content planning and scheduling will connect here when a calendar or CRM integration is configured."
    >
      <div className="admin-card">
        <h2 className="admin-card__title">No connected data source</h2>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Pillar themes, drafts, and scheduled posts are not stored in the database yet. When your team adds a social content
          pipeline or integration, upcoming posts and campaigns will be listed here from live data.
        </p>
      </div>
    </AdminPageShell>
  );
}
