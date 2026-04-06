import AdminPageShell from '../../components/AdminPageShell';

const pillars = [
  { title: 'Awareness', items: ['Impact stories (anonymized)', 'Partner spotlights', 'Fundraising milestones'] },
  { title: 'Trust', items: ['501(c)(3) transparency', 'Staff credentials', 'Annual report links'] },
  { title: 'Safety', items: ['No resident identifiers', 'Legal review queue', 'Crisis resource pinned'] },
];

const upcoming = [
  { date: 'Apr 9', channel: 'Instagram', topic: 'Volunteer week kickoff' },
  { date: 'Apr 14', channel: 'LinkedIn', topic: 'Grant announcement teaser' },
  { date: 'Apr 22', channel: 'Email', topic: 'Spring appeal — education fund' },
];

export default function SocialPage() {
  return (
    <AdminPageShell
      title="Social media strategy"
      description="Content pillars and a lightweight calendar. Scheduling integrations can replace static rows later."
    >
      <div className="admin-two-col">
        <div className="admin-stack">
          {pillars.map((p) => (
            <div key={p.title} className="admin-card">
              <h2 className="admin-card__title">{p.title}</h2>
              <ul className="admin-list-plain">
                {p.items.map((item) => (
                  <li key={item}>
                    <strong>{item}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Upcoming (sample)</h2>
          <ul className="admin-list-plain">
            {upcoming.map((u) => (
              <li key={u.date + u.channel}>
                <strong>
                  {u.date} · {u.channel}
                </strong>
                <span>{u.topic}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="admin-btn admin-btn--primary" style={{ marginTop: 8 }}>
            Add draft post
          </button>
        </div>
      </div>
    </AdminPageShell>
  );
}
