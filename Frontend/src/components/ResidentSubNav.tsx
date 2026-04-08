import { NavLink, useParams } from 'react-router-dom';

export default function ResidentSubNav() {
  const { id } = useParams();
  if (!id) return null;
  const base = `/residents/${id}`;

  return (
    <nav className="admin-subnav" aria-label="Resident sections">
      <NavLink to={base} end>
        Overview
      </NavLink>
      <NavLink to={`${base}/process-recordings`}>Process Recording</NavLink>
      <NavLink to={`${base}/visitations`}>Home Visitation</NavLink>
      <NavLink to={`${base}/conferences`}>Case Conferences</NavLink>
    </nav>
  );
}
