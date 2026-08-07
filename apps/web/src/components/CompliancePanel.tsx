import type { ComplianceReport } from '../types';
import { Badge } from './ui';

function num(v: unknown): string {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('fr-FR');
}

function fmt(v: unknown, unit = ''): string {
  if (v === undefined || v === null || v === '') return '—';
  return `${Number(v).toLocaleString('fr-FR')}${unit}`;
}

function CheckRow({
  ok,
  label,
  detail,
}: {
  ok: boolean | undefined;
  label: string;
  detail?: React.ReactNode;
}) {
  const status = ok ? 'cl-ok' : 'cl-bad';
  return (
    <li>
      <span className={`cl-status ${status}`}>{ok ? '✓' : '✗'}</span>
      <div>
        <strong>{label}</strong>
        {detail && <div className="text-muted" style={{ fontSize: 12 }}>{detail}</div>}
      </div>
    </li>
  );
}

export default function CompliancePanel({ report }: { report: ComplianceReport }) {
  const s = report?.summary;
  const banner = s?.fullCompliant
    ? { cls: 'ok', icon: '✅', title: 'Conforme STEG' }
    : s?.errorCount === 0
      ? { cls: 'review', icon: '⚠️', title: 'À vérifier' }
      : { cls: 'error', icon: '❌', title: 'Non conforme' };

  const sc = report?.compatibility?.stringComputation;
  const pr = report?.compatibility?.powerRatio;
  const dc = report?.cableAnalysis?.dc;
  const ac = report?.cableAnalysis?.ac;
  const wind = report?.windAnalysis;

  return (
    <div>
      <div className={`compliance-banner ${banner.cls}`}>
        <span className="cb-icon">{banner.icon}</span>
        <div>
          <div>{banner.title}</div>
          <div style={{ fontWeight: 400, fontSize: 12.5 }}>
            {s?.overallStatus} — {s?.errorCount ?? 0} erreur(s), {s?.warningCount ?? 0} avertissement(s)
          </div>
        </div>
      </div>

      <ul className="check-list">
        <CheckRow
          ok={s?.stringCompliant}
          label="Configuration des chaînes"
          detail={sc ? `Nb panneaux ${sc.panelCount} (${sc.nsMin}–${sc.nsMax} / chaîne, ${sc.nbMppt} MPPT)` : undefined}
        />
        <CheckRow
          ok={s?.powerCompliant}
          label="Ratio de puissance"
          detail={pr ? `${num(pr.pvPower)} kWc / ${num(pr.acPower)} kW onduleur = ${fmt(pr.ratio)}` : undefined}
        />
        <CheckRow ok={s?.dcCompliant} label="Chute de tension DC" detail={dc ? `Chute ${fmt(dc.dropPercent, '%')} (max 3%)` : undefined} />
        <CheckRow ok={s?.acCompliant} label="Chute de tension AC" detail={ac ? `Chute ${fmt(ac.dropPercent, '%')} (max 3%)` : undefined} />
        <CheckRow ok={s?.dcProtectionCompliant} label="Protections DC" detail="Sectionneur, parafoudre et fusibles dimensionnés" />
        <CheckRow ok={s?.acProtectionCompliant} label="Protections AC" detail="Disjoncteur et parafoudre AC dimensionnés" />
        <CheckRow
          ok={s?.windCompliant}
          label="Tenue au vent"
          detail={wind ? `Ballast requis ${fmt(wind.requiredBallastKg, ' kg')}${wind.ballastWeightKg ? ` — installé ${fmt(wind.ballastWeightKg, ' kg')}` : ''}` : undefined}
        />
      </ul>

      <div className="grid grid-2 mt-16">
        <div className="card">
          <h4 className="card-title">Dimensionnement des câbles</h4>
          {dc && (
            <div className="kv">
              <div className="kv-item"><span className="k">Section DC</span><span className="v">{fmt(dc.section, ' mm²')}</span></div>
              <div className="kv-item"><span className="k">Section DC recommandée</span><span className="v">{fmt(dc.recommendedSection, ' mm²')}</span></div>
              <div className="kv-item"><span className="k">Chute DC</span><span className="v">{fmt(dc.dropPercent, '%')}</span></div>
              <div className="kv-item"><span className="k">Conforme</span><span className="v">{dc.compliant ? '✅' : '❌'}</span></div>
            </div>
          )}
          {ac && (
            <div className="kv" style={{ marginTop: 12 }}>
              <div className="kv-item"><span className="k">Section AC</span><span className="v">{fmt(ac.section, ' mm²')}</span></div>
              <div className="kv-item"><span className="k">Section AC recommandée</span><span className="v">{fmt(ac.recommendedSection, ' mm²')}</span></div>
              <div className="kv-item"><span className="k">Chute AC</span><span className="v">{fmt(ac.dropPercent, '%')}</span></div>
              <div className="kv-item"><span className="k">Conforme</span><span className="v">{ac.compliant ? '✅' : '❌'}</span></div>
            </div>
          )}
        </div>

        <div className="card">
          <h4 className="card-title">Tenue au vent & ballast</h4>
          {wind ? (
            <div className="kv">
              <div className="kv-item"><span className="k">Vitesse vent</span><span className="v">{fmt(wind.windSpeedKmh, ' km/h')}</span></div>
              <div className="kv-item"><span className="k">Pression du vent</span><span className="v">{fmt(wind.windPressure, ' Pa')}</span></div>
              <div className="kv-item"><span className="k">Ballast requis</span><span className="v">{fmt(wind.requiredBallastKg, ' kg')}</span></div>
              <div className="kv-item"><span className="k">Ballast installé</span><span className="v">{fmt(wind.ballastWeightKg, ' kg')}</span></div>
              <div className="kv-item"><span className="k">Conforme</span><span className="v">{wind.compliant ? '✅' : '❌'}</span></div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Analyse vent non disponible.</p>
          )}
        </div>
      </div>

      {report?.errors?.length > 0 && (
        <div className="msg-box error mt-16">
          <strong>Erreurs ({report.errors.length}) :</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {report.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {report?.warnings?.length > 0 && (
        <div className="msg-box warn mt-16">
          <strong>Avertissements ({report.warnings.length}) :</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {report.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {report?.parameters && (
        <div className="mt-16" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge color="blue">Rapport du {new Date(report.timestamp || Date.now()).toLocaleString('fr-FR')}</Badge>
          <Badge color="blue">Coeff. PV : {fmt(report.parameters.pvTempCoeffPmax, '%/°C')} · Irm : {fmt(report.parameters.irm, ' A')}</Badge>
        </div>
      )}
    </div>
  );
}
