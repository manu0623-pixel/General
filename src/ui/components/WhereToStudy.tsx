import type { CareerCatalog, ResolvedCareer } from '../../domain/types';

/** Lista dónde se puede estudiar una carrera: institución, ciudad y facultad. */
export function WhereToStudy({ career, catalog, compact = false }: { career: ResolvedCareer; catalog: CareerCatalog; compact?: boolean }) {
  if (compact) {
    return (
      <span className="row" style={{ gap: 6 }}>
        {career.offerings.map((o, i) => (
          <span key={i} className="small"><span className="inst" data-inst={o.institution}>{o.institution}</span> {o.facultad}</span>
        ))}
      </span>
    );
  }
  return (
    <div className="where">
      {career.offerings.map((o, i) => {
        const inst = catalog.institutions?.find((x) => x.id === o.institution);
        return (
          <div key={i} className="where-row">
            <span className="inst" data-inst={o.institution}>{o.institution}</span>
            <span>
              <span className="where-fac">{o.facultad}</span>
              <span className="where-sub">
                {inst?.name ?? o.institution} · {o.city}
                {o.title && o.title !== career.name ? ` · como «${o.title}»` : ''}
              </span>
              {o.note && <span className="where-sub">{o.note}</span>}
              {inst?.note && i === career.offerings.findIndex((x) => x.institution === o.institution) && <span className="where-sub muted">{inst.note}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
