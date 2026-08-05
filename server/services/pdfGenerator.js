import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * Generate a STEG-compliant technical dossier PDF
 * @param {Object} dossierData - Complete dossier object with all specs
 * @param {Object} complianceReport - Results from stegCalculations
 * @returns {Promise<Buffer>} PDF file buffer
 */
export async function generateStegPDF(dossierData, complianceReport) {
  try {
    const htmlContent = generateStegHTML(dossierData, complianceReport);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF with STEG document format (A4, 21 pages)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: 20, right: 15, bottom: 20, left: 15 },
      printBackground: true,
      preferCSSPageBreaks: true,
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

/**
 * Generate HTML template matching STEG 21-page structure
 */
export function generateStegHTML(dossierData, complianceReport) {
  const { customerDetails, pvSystemParams, equipment, status } = dossierData;
  const { parameters, compatibility, cableAnalysis, windAnalysis, summary } = complianceReport;

  const generatedDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dossier Technique STEG</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 20px 15px;
      @bottom-center {
        content: counter(page) "/" counter(pages);
        font-size: 10px;
        color: #666;
      }
    }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
      background: white;
    }
    
    .page-break {
      page-break-after: always;
      margin-bottom: 0;
    }
    
    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      text-align: center;
      border: 3px solid #003366;
      padding: 40px;
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
    }
    
    .title-page h1 {
      font-size: 36px;
      color: #003366;
      margin-bottom: 20px;
      font-weight: bold;
    }
    
    .title-page h2 {
      font-size: 24px;
      color: #666;
      margin-bottom: 40px;
      font-weight: normal;
    }
    
    .title-info {
      margin: 20px 0;
      font-size: 12px;
      line-height: 2;
    }
    
    .title-info strong {
      color: #003366;
    }
    
    h1, h2, h3, h4 {
      color: #003366;
      margin-top: 15px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    
    h1 { font-size: 18px; font-weight: bold; border-bottom: 2px solid #003366; padding-bottom: 5px; }
    h2 { font-size: 14px; font-weight: bold; }
    h3 { font-size: 12px; font-weight: bold; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      page-break-inside: avoid;
    }
    
    table th {
      background-color: #e6f0f7;
      color: #003366;
      padding: 8px;
      border: 1px solid #999;
      text-align: left;
      font-weight: bold;
      font-size: 10px;
    }
    
    table td {
      padding: 6px 8px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .compliance-status {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      font-weight: bold;
    }
    
    .status-ok {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .status-warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }
    
    .status-error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .info-box {
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    
    .label {
      font-weight: bold;
      color: #003366;
      min-width: 150px;
      display: inline-block;
    }
    
    .value {
      color: #333;
    }
    
    .toc {
      margin: 20px 0;
    }
    
    .toc-item {
      margin: 5px 0;
      padding-left: 20px;
    }
    
    .toc-item.level-1 { font-weight: bold; }
    .toc-item.level-2 { padding-left: 40px; font-size: 10px; }
    
    .calculation-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .calc-card {
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f0f7ff;
      border-left: 4px solid #003366;
    }
    
    .calc-card h4 {
      margin-top: 0;
      font-size: 11px;
    }
    
    .formula {
      font-family: 'Courier New', monospace;
      font-size: 9px;
      background-color: #fff;
      padding: 5px;
      border: 1px solid #ddd;
      margin: 5px 0;
      color: #555;
    }
  </style>
</head>
<body>

<!-- PAGE 1: TITLE PAGE -->
<div class="title-page">
  <h1>DOSSIER TECHNIQUE</h1>
  <h2>Installation Photovoltaïque</h2>
  <div class="title-info">
    <div><strong>Client:</strong> ${customerDetails?.name || 'Non spécifié'}</div>
    <div><strong>Capacité Installée:</strong> ${pvSystemParams?.peakPowerKwc || 0} kWc</div>
    <div><strong>Date de Génération:</strong> ${generatedDate}</div>
    <div><strong>Statut:</strong> ${status || 'DRAFT'}</div>
    <div style="margin-top: 30px;"><strong>Adresse:</strong> ${customerDetails?.address || 'Non spécifiée'}</div>
    <div><strong>Référence Compteur STEG:</strong> ${customerDetails?.stegMeterRef || 'N/A'}</div>
  </div>
</div>

<!-- PAGE 2: TABLE OF CONTENTS -->
<div class="page-break">
  <h1>SOMMAIRE</h1>
  <div class="toc">
    <div class="toc-item level-1">I. Introduction Générale</div>
    <div class="toc-item level-1">II. Documentation de la Solution</div>
    <div class="toc-item level-1">III. Équipements de la Solution Proposée</div>
    <div class="toc-item level-1">IV. Caractéristiques Techniques & Compatibilité</div>
    <div class="toc-item level-1">V. Dimensionnement Protections DC</div>
    <div class="toc-item level-1">VI. Dimensionnement Protections AC</div>
    <div class="toc-item level-1">VII. Dimensionnement Câbles DC/AC</div>
    <div class="toc-item level-1">VIII. Câblage Panneaux & Mise à la Terre</div>
    <div class="toc-item level-1">IX. Structure & Note de Calcul Vent</div>
    <div class="toc-item level-1">Annexes: Documentation des Équipements</div>
  </div>
</div>

<!-- PAGE 3: SECTION I -->
<div class="page-break">
  <h1>I. INTRODUCTION GÉNÉRALE</h1>
  
  <div class="section">
    <h2>Contexte du Projet</h2>
    <p>Ce dossier technique décrit l'installation d'un système photovoltaïque connecté au réseau d'une puissance de <strong>${pvSystemParams?.peakPowerKwc || 0} kWc</strong>.</p>
    <p>L'installation est conforme aux normes STEG, NF C 15-100 et aux standards internationaux IEC 61730.</p>
  </div>
  
  <div class="section">
    <h2>Informations Client</h2>
    <table>
      <tr><td><span class="label">Nom:</span></td><td class="value">${customerDetails?.name || '-'}</td></tr>
      <tr><td><span class="label">Adresse:</span></td><td class="value">${customerDetails?.address || '-'}</td></tr>
      <tr><td><span class="label">Téléphone:</span></td><td class="value">${customerDetails?.phone || '-'}</td></tr>
      <tr><td><span class="label">CIN:</span></td><td class="value">${customerDetails?.cin || '-'}</td></tr>
      <tr><td><span class="label">Référence STEG:</span></td><td class="value">${customerDetails?.stegMeterRef || '-'}</td></tr>
    </table>
  </div>
</div>

<!-- PAGE 4: SECTION II - DOCUMENTATION -->
<div class="page-break">
  <h1>II. DOCUMENTATION DE LA SOLUTION</h1>
  
  <h2>Annexes Fournies</h2>
  <p>Le dossier technique inclut les documents suivants:</p>
  <table>
    <tr><th>N°</th><th>Document</th><th>Statut</th></tr>
    <tr><td>A1</td><td>Schéma Unifilaire Monophase (A3)</td><td>À joindre</td></tr>
    <tr><td>A2</td><td>Plan d'Implantation Panneaux (A3)</td><td>À joindre</td></tr>
    <tr><td>A3</td><td>Fiche Technique Panneaux Photovoltaïques</td><td>Intégrée</td></tr>
    <tr><td>A4</td><td>Fiche Technique Onduleur</td><td>Intégrée</td></tr>
    <tr><td>A5</td><td>Fiche Technique Protection DC</td><td>Intégrée</td></tr>
    <tr><td>A6</td><td>Fiche Technique Protection AC</td><td>Intégrée</td></tr>
    <tr><td>A7</td><td>Rapport PVsyst ou Simulation Énergétique</td><td>À joindre</td></tr>
    <tr><td>A8</td><td>Attestation Déclaration Travaux</td><td>À joindre</td></tr>
  </table>
</div>

<!-- PAGE 5: SECTION III - ÉQUIPEMENTS -->
<div class="page-break">
  <h1>III. ÉQUIPEMENTS DE LA SOLUTION PROPOSÉE</h1>
  
  <h2>Synthèse des Équipements</h2>
  <table>
    <tr>
      <th>Catégorie</th>
      <th>Marque</th>
      <th>Modèle</th>
      <th>Quantité</th>
      <th>Paramètre Clé</th>
    </tr>
    <tr>
      <td>Panneaux PV</td>
      <td>${equipment?.panel?.brand || '-'}</td>
      <td>${equipment?.panel?.model || '-'}</td>
      <td>${pvSystemParams?.panelCount || '-'}</td>
      <td>${equipment?.panel?.specs?.pmax || '-'} W</td>
    </tr>
    <tr>
      <td>Onduleur</td>
      <td>${equipment?.inverter?.brand || '-'}</td>
      <td>${equipment?.inverter?.model || '-'}</td>
      <td>1</td>
      <td>${equipment?.inverter?.specs?.pac || '-'} W</td>
    </tr>
    <tr>
      <td>Protection DC</td>
      <td>${equipment?.dcProtection?.brand || '-'}</td>
      <td>${equipment?.dcProtection?.model || '-'}</td>
      <td>1</td>
      <td>${equipment?.dcProtection?.specs?.in || '-'} A</td>
    </tr>
    <tr>
      <td>Protection AC</td>
      <td>${equipment?.acProtection?.brand || '-'}</td>
      <td>${equipment?.acProtection?.model || '-'}</td>
      <td>1</td>
      <td>${equipment?.acProtection?.specs?.in || '-'} A</td>
    </tr>
  </table>
</div>

<!-- PAGE 6-8: SECTION IV - CARACTÉRISTIQUES TECHNIQUES -->
<div class="page-break">
  <h1>IV. CARACTÉRISTIQUES TECHNIQUES & COMPATIBILITÉ</h1>
  
  <h2>Paramètres des Panneaux Photovoltaïques</h2>
  <p>Ajustements de température (Tmin = -10°C, Tmax = 85°C)</p>
  
  <table>
    <tr>
      <th>Paramètre</th>
      <th>@ 25°C</th>
      <th>@ -10°C (MIN)</th>
      <th>@ 85°C (MAX)</th>
      <th>Unité</th>
    </tr>
    <tr>
      <td>Tension OC (Voc)</td>
      <td>${parameters?.panelTemperatureAdjustments?.vocBase.toFixed(2) || '-'}</td>
      <td><strong>${parameters?.panelTemperatureAdjustments?.vocMin10.toFixed(2) || '-'}</strong></td>
      <td>-</td>
      <td>V</td>
    </tr>
    <tr>
      <td>Tension MPP (Vmpp)</td>
      <td>${parameters?.panelTemperatureAdjustments?.vmppBase.toFixed(2) || '-'}</td>
      <td><strong>${parameters?.panelTemperatureAdjustments?.vmppMin10.toFixed(2) || '-'}</strong></td>
      <td>${parameters?.panelTemperatureAdjustments?.vmpp85.toFixed(2) || '-'}</td>
      <td>V</td>
    </tr>
    <tr>
      <td>Courant SC (Isc)</td>
      <td>${parameters?.panelTemperatureAdjustments?.iscBase || '-'}</td>
      <td>-</td>
      <td><strong>${parameters?.panelTemperatureAdjustments?.isc85.toFixed(2) || '-'}</strong></td>
      <td>A</td>
    </tr>
  </table>
  
  <h2>Dimensionnement Chaînes de Panneaux</h2>
  <div class="calculation-grid">
    <div class="calc-card">
      <h4>Nombre Maximum de Panneaux (Ns_max)</h4>
      <div class="formula">Ns_max = floor(Udcmax / Voc(-10°C))</div>
      <div class="formula">Ns_max = ${compatibility?.stringComputation?.nsMax || '-'}</div>
      <div style="margin-top: 5px;">Configuration actuelle: <strong>${compatibility?.stringComputation?.panelCount || '-'} panneaux</strong></div>
    </div>
    <div class="calc-card">
      <h4>Nombre Minimum de Panneaux (Ns_min)</h4>
      <div class="formula">Ns_min = ceil(Umpptmin / Vmpp(85°C))</div>
      <div class="formula">Ns_min = ${compatibility?.stringComputation?.nsMin || '-'}</div>
      <div style="margin-top: 5px;">Configuration: ${compatibility?.stringComputation?.currentSelection || '-'}</div>
    </div>
  </div>
  
  <h2>Ratio de Puissance</h2>
  <p>Vérification de la compatibilité: 0.9 ≤ (P_PV / P_AC) ≤ 1.3</p>
  <table>
    <tr>
      <td><span class="label">Puissance PV:</span></td>
      <td>${compatibility?.powerRatio?.pvPower || '-'} W</td>
    </tr>
    <tr>
      <td><span class="label">Puissance AC (Onduleur):</span></td>
      <td>${compatibility?.powerRatio?.acPower || '-'} W</td>
    </tr>
    <tr>
      <td><span class="label">Ratio:</span></td>
      <td><strong>${compatibility?.powerRatio?.ratio.toFixed(2) || '-'}</strong></td>
    </tr>
    <tr>
      <td><span class="label">Statut:</span></td>
      <td>
        <span class="compliance-status ${compatibility?.powerRatio?.valid ? 'status-ok' : 'status-error'}">
          ${compatibility?.powerRatio?.message}
        </span>
      </td>
    </tr>
  </table>
</div>

<!-- PAGE 9: SECTION V - PROTECTION DC -->
<div class="page-break">
  <h1>V. DIMENSIONNEMENT PROTECTIONS DC</h1>
  
  <h2>Fusibles DC Chaîne</h2>
  <p>Courant de conception chaîne PV:</p>
  <table>
    <tr><th>Paramètre</th><th>Valeur</th></tr>
    <tr><td>Courant MPP (Impp):</td><td>-</td></tr>
    <tr><td>Courant de conception (1.25 × Impp):</td><td>-</td></tr>
    <tr><td>Fusible recommandé (In):</td><td>${compatibility?.stringComputation?.impp || '-'} A</td></tr>
  </table>
  
  <h2>Protection Surcharge / Surtension DC</h2>
  <p>Sélection des appareils de protection:</p>
  <table>
    <tr><th>Appareil</th><th>Calibre</th><th>Norme</th></tr>
    <tr><td>Fusibles Chaîne</td><td>${equipment?.dcProtection?.specs?.in || '-'} A</td><td>IEC 60269</td></tr>
    <tr><td>Protection Surcharge</td><td>-</td><td>NF C 15-100</td></tr>
    <tr><td>Parafoudre DC</td><td>${equipment?.dcProtection?.specs?.up || '-'} V</td><td>IEC 61643-1</td></tr>
  </table>
</div>

<!-- PAGE 10: SECTION VI - PROTECTION AC -->
<div class="page-break">
  <h1>VI. DIMENSIONNEMENT PROTECTIONS AC</h1>
  
  <h2>Protection Côté AC</h2>
  <table>
    <tr><th>Appareil</th><th>Calibre</th><th>Fonction</th></tr>
    <tr><td>Disjoncteur AC</td><td>${equipment?.acProtection?.specs?.in || '-'} A</td><td>Protection surcharge/court-circuit</td></tr>
    <tr><td>Parafoudre AC</td><td>${equipment?.acProtection?.specs?.up || '-'} V</td><td>Protection surtension</td></tr>
    <tr><td>Dispositif Différentiel</td><td>30 mA</td><td>Protection personne</td></tr>
  </table>
  
  <h2>Coordination des Protections</h2>
  <p>Les protections AC sont sélectionnées en accord avec les contraintes du réseau STEG et les normes NF C 15-100.</p>
</div>

<!-- PAGE 11-13: SECTION VII - CÂBLES -->
<div class="page-break">
  <h1>VII. DIMENSIONNEMENT CÂBLES DC/AC</h1>
  
  <h2>Câblage DC - Panneaux vers Onduleur</h2>
  <table>
    <tr><th>Paramètre</th><th>Valeur</th><th>Norme</th></tr>
    <tr><td>Longueur:</td><td>${cableAnalysis?.dc?.length} m</td><td>-</td></tr>
    <tr><td>Section:</td><td>${cableAnalysis?.dc?.section} mm²</td><td>NF C 15-100</td></tr>
    <tr><td>Courant nominal (Iz):</td><td>${cableAnalysis?.dc?.iz} A</td><td>-</td></tr>
    <tr><td>Courant MPP:</td><td>${cableAnalysis?.dc?.impp.toFixed(2)} A</td><td>-</td></tr>
  </table>
  
  <h2>Chute de Tension DC</h2>
  <p>Formule: ΔU% = (200 × ρ × L × I) / (S × U)</p>
  <table>
    <tr><th>Paramètre</th><th>Valeur</th></tr>
    <tr><td>Tension MPP totale:</td><td>${cableAnalysis?.dc?.vmppTotal.toFixed(2)} V</td></tr>
    <tr><td>Chute de tension:</td><td><strong>${cableAnalysis?.dc?.dropPercent.toFixed(2)}%</strong></td></tr>
    <tr><td>Chute en volts:</td><td>${cableAnalysis?.dc?.dropVolt.toFixed(2)} V</td></tr>
    <tr><td>Statut (≤ 3%):</td><td>
      <span class="compliance-status ${cableAnalysis?.dc?.compliant ? 'status-ok' : 'status-error'}">
        ${cableAnalysis?.dc?.message}
      </span>
    </td></tr>
  </table>
  
  <h2>Câblage AC - Onduleur vers Réseau STEG</h2>
  <table>
    <tr><th>Paramètre</th><th>Valeur</th><th>Norme</th></tr>
    <tr><td>Longueur:</td><td>${cableAnalysis?.ac?.length} m</td><td>-</td></tr>
    <tr><td>Section:</td><td>${cableAnalysis?.ac?.section} mm²</td><td>NF C 15-100</td></tr>
    <tr><td>Tension réseau:</td><td>${cableAnalysis?.ac?.vGrid} V</td><td>-</td></tr>
    <tr><td>Courant max:</td><td>${cableAnalysis?.ac?.iacMax} A</td><td>-</td></tr>
  </table>
  
  <h2>Chute de Tension AC</h2>
  <table>
    <tr><th>Paramètre</th><th>Valeur</th></tr>
    <tr><td>Chute de tension:</td><td><strong>${cableAnalysis?.ac?.dropPercent.toFixed(2)}%</strong></td></tr>
    <tr><td>Chute en volts:</td><td>${cableAnalysis?.ac?.dropVolt.toFixed(2)} V</td></tr>
    <tr><td>Statut (≤ 3%):</td><td>
      <span class="compliance-status ${cableAnalysis?.ac?.compliant ? 'status-ok' : 'status-error'}">
        ${cableAnalysis?.ac?.message}
      </span>
    </td></tr>
  </table>
</div>

<!-- PAGE 14: SECTION VIII - CÂBLAGE ET MISE À LA TERRE -->
<div class="page-break">
  <h1>VIII. CÂBLAGE PANNEAUX & MISE À LA TERRE</h1>
  
  <h2>Schéma de Câblage</h2>
  <p>Les panneaux sont connectés en série de ${compatibility?.stringComputation?.panelCount || '-'} modules.</p>
  <p>Configuration: Chaîne unique vers l'onduleur avec fusible de chaîne DC.</p>
  
  <h2>Mise à la Terre</h2>
  <p>Référence norme: NF C 15-100 et UTE 15-443</p>
  <table>
    <tr><th>Élément</th><th>Description</th></tr>
    <tr><td>Conducteur de PE (Terre)</td><td>Cuivre, section ≥ ${cableAnalysis?.dc?.section} mm²</td></tr>
    <tr><td>Boucle de Mise à Terre</td><td>Profondeur ≥ 80 cm, Conductibilité < 100 Ω</td></tr>
    <tr><td>Équipotentialité</td><td>Point unique de mise à terre au disjoncteur principal</td></tr>
  </table>
</div>

<!-- PAGE 15: SECTION IX - STRUCTURE & CALCUL VENT -->
<div class="page-break">
  <h1>IX. STRUCTURE & NOTE DE CALCUL VENT</h1>
  
  <h2>Résistance au Vent (Vitesse 120 km/h = 33.3 m/s)</h2>
  <p>Pression dynamique: q = 625 Pa (pour 120 km/h)</p>
  
  <table>
    <tr><th>Paramètre</th><th>Valeur</th><th>Unité</th></tr>
    <tr><td>Pression du vent:</td><td>${windAnalysis?.windPressure}</td><td>Pa</td></tr>
    <tr><td>Surface panneaux:</td><td>${windAnalysis?.panelArea}</td><td>m²</td></tr>
    <tr><td>Force du vent:</td><td>${windAnalysis?.windForce.toFixed(2)}</td><td>N</td></tr>
    <tr><td>Poids structure + panneaux:</td><td>${windAnalysis?.panelWeightN.toFixed(2)}</td><td>N</td></tr>
    <tr><td>Ratio stabilité:</td><td>${(windAnalysis?.panelWeightN / windAnalysis?.windForce).toFixed(2)}</td><td>-</td></tr>
  </table>
  
  <h2>Vérification d'Équilibre</h2>
  <p>Contrôle moment: Moment poids ≥ Moment vent</p>
  <div class="compliance-status ${windAnalysis?.compliant ? 'status-ok' : 'status-warning'}">
    ${windAnalysis?.message}
  </div>
  <p style="margin-top: 10px; font-size: 10px;">
    ${windAnalysis?.compliant 
      ? 'La structure est stable aux conditions de vent extrême. Pas de ballast supplémentaire nécessaire.'
      : 'La structure peut nécessiter un ballast supplémentaire. À vérifier avec le fournisseur de structure.'}
  </p>
</div>

<!-- PAGE 16: RÉSUMÉ DE CONFORMITÉ -->
<div class="page-break">
  <h1>RÉSUMÉ DE CONFORMITÉ STEG/NF C 15-100</h1>
  
  <div style="margin: 20px 0;">
    <h2>État Global du Dossier</h2>
    <div class="compliance-status ${summary?.fullCompliant ? 'status-ok' : summary?.errorCount > 0 ? 'status-error' : 'status-warning'}">
      <strong>STATUT GLOBAL:</strong> ${summary?.overallStatus || 'INCONNU'}
    </div>
  </div>
  
  <h2>Checklist de Conformité</h2>
  <table>
    <tr>
      <th>Critère</th>
      <th>Statut</th>
      <th>Détail</th>
    </tr>
    <tr>
      <td>Chaînes de panneaux</td>
      <td>${summary?.stringCompliant ? '✓' : '✗'}</td>
      <td>${compatibility?.stringComputation?.nsMin || '-'} ≤ ${compatibility?.stringComputation?.panelCount || '-'} ≤ ${compatibility?.stringComputation?.nsMax || '-'}</td>
    </tr>
    <tr>
      <td>Ratio puissance</td>
      <td>${summary?.powerCompliant ? '✓' : '✗'}</td>
      <td>Ratio: ${compatibility?.powerRatio?.ratio.toFixed(2) || '-'}</td>
    </tr>
    <tr>
      <td>Chute tension DC</td>
      <td>${summary?.dcCompliant ? '✓' : '✗'}</td>
      <td>${cableAnalysis?.dc?.dropPercent.toFixed(2) || '-'}% (limite: 3%)</td>
    </tr>
    <tr>
      <td>Chute tension AC</td>
      <td>${summary?.acCompliant ? '✓' : '✗'}</td>
      <td>${cableAnalysis?.ac?.dropPercent.toFixed(2) || '-'}% (limite: 3%)</td>
    </tr>
    <tr>
      <td>Résistance vent</td>
      <td>${windAnalysis?.compliant ? '✓' : '⚠'}</td>
      <td>${windAnalysis?.message}</td>
    </tr>
  </table>
  
  ${summary?.errorCount > 0 ? `
  <h2 style="color: #721c24; margin-top: 20px;">Erreurs Identifiées (${summary?.errorCount})</h2>
  <ul style="color: #721c24;">
    ${complianceReport?.errors?.map(err => `<li>${err}</li>`).join('') || '<li>Aucune erreur détaillée</li>'}
  </ul>
  ` : ''}
  
  ${summary?.warningCount > 0 ? `
  <h2 style="color: #856404;">Avertissements (${summary?.warningCount})</h2>
  <ul style="color: #856404;">
    ${complianceReport?.warnings?.map(warn => `<li>${warn}</li>`).join('') || '<li>Aucun avertissement</li>'}
  </ul>
  ` : ''}
</div>

<!-- PAGE 17: DÉCLARATIONS ET CERTIFICATIONS -->
<div class="page-break">
  <h1>DÉCLARATIONS ET CERTIFICATIONS</h1>
  
  <h2>Conformité Réglementaire</h2>
  <p>Ce dossier technique certifie que l'installation photovoltaïque proposée est conforme aux normes:</p>
  <ul>
    <li>✓ NF C 15-100 (Installation électrique basse tension)</li>
    <li>✓ IEC 61730 (Qualité et sécurité des modules PV)</li>
    <li>✓ IEC 61636 (Connecteurs pour systèmes PV)</li>
    <li>✓ IEC 61859 (Fusibles DC pour systèmes PV)</li>
    <li>✓ Guide STEG pour installations PV connectées réseau</li>
  </ul>
  
  <h2>Signature du Concepteur</h2>
  <table style="margin-top: 30px;">
    <tr>
      <td style="border: none; padding: 20px 0;">
        <p>Nom: _____________________</p>
        <p>Signature: __________________</p>
        <p>Date: ${generatedDate}</p>
      </td>
      <td style="border: none; padding: 20px 0;">
        <p>Tampon / Logo Entreprise</p>
        <br><br><br>
      </td>
    </tr>
  </table>
</div>

</body>
</html>
  `;
}
