'use strict';

/* ---------- generic DOM helpers ---------- */
const $ = (id) => document.getElementById(id);
const v = (id) => { const el = $(id); return el ? el.value.trim() : ''; };
const c = (id) => { const el = $(id); return el ? el.checked : false; };
const r = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ''; };

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function list(items, connector = ' und ') {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  return filtered.slice(0, -1).join(', ') + connector + filtered[filtered.length - 1];
}

function toggleText(checkboxId, defaultText, textFieldId) {
  if (c(checkboxId)) return defaultText;
  const t = textFieldId ? v(textFieldId) : '';
  return t || '___';
}

function clean(text) {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ \./g, '.')
    .replace(/ ,/g, ',')
    .trim();
}

function sexForms() {
  const sex = r('g-sex') || 'w';
  if (sex === 'm') return { code: 'm', noun: 'Patient', nounGen: 'des Patienten', e: 'er', inSuffix: '' };
  return { code: 'w', noun: 'Patientin', nounGen: 'der Patientin', e: 'e', inSuffix: 'in' };
}

/* ---------- Anamnese: Leitsymptom blocks (multi-select, click order) ---------- */
const SYMPTOM_LABELS = {
  vigilanz: 'Vigilanzminderung',
  dyspnoe: 'Dyspnoe',
  thorax: 'Thoraxschmerzen',
  bauch: 'Bauchschmerzen',
  dysurie: 'Dysurie',
  diarrhoe: 'Diarrhoe',
  schwindel: 'Schwindel',
  teerstuhl: 'Teerstuhl',
  haematochezie: 'Hämatochezie',
  sonstige: 'Sonstige Schmerzen'
};

/* Tracks the order symptoms were checked in (persisted, see save/load below).
   selectedSymptomKeys() keeps it in sync with current checkbox state on every call. */
let symptomOrder = [];

function selectedSymptomKeys() {
  const checked = Object.keys(SYMPTOM_LABELS).filter((k) => c('a-sym-' + k));
  symptomOrder = symptomOrder.filter((k) => checked.includes(k));
  checked.forEach((k) => { if (!symptomOrder.includes(k)) symptomOrder.push(k); });
  return symptomOrder.slice();
}

function akuitaetLabel(prefix) {
  return r(`${prefix}-akuitaet`) === 'chronisch' ? 'chronisch' : 'akut';
}

/* Each case returns { main, extra }: main is the core clause (no trailing
   period, so several can be joined with "und" right after "... erfolgte
   [...] bei"); extra is the accompanying findings, attributed to its
   symptom label only when several symptoms are selected. */
function buildSymptomBlock(key) {
  const parts = [];
  const P = (label, val) => { if (val) parts.push(`${label}: ${val}`); };

  switch (key) {
    case 'vigilanz': {
      const akut = akuitaetLabel('a-vig');
      const beginn = r('a-vig-beginn') === 'schleichend' ? 'schleichend' : 'plötzlich';
      const dauer = v('a-vig-dauer');
      const gcs = c('a-vig-gcs');
      const ausgang = v('a-vig-ausgangszustand');
      const extra = list([
        c('a-vig-infekt') ? 'Infektzeichen' : '',
        c('a-vig-neuro') ? 'neurologische Auffälligkeiten' : ''
      ], ' und ');
      let main = `Vigilanzminderung (${akut}): ${beginn}${dauer ? ' seit ' + dauer : ''}`;
      main += gcs ? ', GCS 15 und Orientierung 4-fach vorhanden' : ', Vigilanz/Orientierung eingeschränkt';
      main += `, bei ${ausgang || '___'} Ausgangszustand`;
      return { main, extra: extra ? `V. a. ${extra}` : 'kein Hinweis auf Infekt oder neurologisches Defizit' };
    }
    case 'dyspnoe': {
      const akut = akuitaetLabel('a-dysp');
      P('O', v('a-dysp-onset'));
      P('P', v('a-dysp-provokation'));
      const qual = r('a-dysp-qualitaet');
      P('Q', qual === 'insp' ? 'inspiratorisch' : qual === 'exsp' ? 'exspiratorisch' : '');
      const nyha = v('a-dysp-nyha');
      P('S', nyha ? `NYHA ${nyha}` : '');
      P('T', v('a-dysp-verlauf'));
      const hustenFreq = v('a-dysp-husten-freq');
      const husten = c('a-dysp-husten') ? `Husten${hustenFreq ? ' (' + hustenFreq + 'x/Tag)' : ''}` : '';
      const auswurfFreq = v('a-dysp-auswurf-freq');
      const auswurfFarbe = r('a-dysp-auswurf-farbe') === 'gelblich' ? 'gelblicher' : 'weißlicher';
      const auswurf = c('a-dysp-auswurf') ? `${auswurfFarbe} Auswurf${auswurfFreq ? ' (' + auswurfFreq + 'x/Tag)' : ''}` : '';
      const extra = list([
        husten,
        auswurf,
        c('a-dysp-fieber') ? 'Fieber' : '',
        c('a-dysp-ap') ? 'Angina pectoris' : '',
        c('a-dysp-haemoptysen') ? 'Hämoptysen' : ''
      ]);
      const main = `Dyspnoe (${[akut, ...parts].join(', ')})`;
      return { main, extra };
    }
    case 'thorax': {
      const akut = akuitaetLabel('a-thor');
      P('O', v('a-thor-onset'));
      P('P', v('a-thor-provokation'));
      P('Q', v('a-thor-qualitaet'));
      P('R', v('a-thor-region'));
      const staerke = v('a-thor-staerke');
      P('S', staerke ? `${staerke}/10` : '');
      P('T', v('a-thor-verlauf'));
      const extra = list([
        c('a-thor-rf') ? 'kardiovaskuläre Risikofaktoren' : '',
        c('a-thor-kaltschweiss') ? 'Kaltschweißigkeit' : '',
        c('a-thor-neuro') ? 'neurologische Auffälligkeiten' : '',
        c('a-thor-dyspnoe') ? 'Dyspnoe' : '',
        c('a-thor-palpitation') ? 'Palpitationen' : ''
      ]);
      const main = `Thoraxschmerzen (${[akut, ...parts].join(', ')})`;
      return { main, extra };
    }
    case 'bauch': {
      const akut = akuitaetLabel('a-bauch');
      P('O', v('a-bauch-onset'));
      P('P', v('a-bauch-provokation'));
      P('Q', v('a-bauch-qualitaet'));
      P('R', v('a-bauch-region'));
      const staerke = v('a-bauch-staerke');
      P('S', staerke ? `${staerke}/10` : '');
      P('T', v('a-bauch-verlauf'));
      const main = `Bauchschmerzen (${[akut, ...parts].join(', ')})`;
      const zusatz = [];
      if (c('a-bauch-erbrechen')) zusatz.push('Erbrechen/Übelkeit');
      const stuhl = r('a-bauch-stuhl');
      const stuhlLabel = { waessrig: 'wässriger Stuhl', blutig: 'blutiger Stuhl', schleimig: 'schleimiger Stuhl', fettig: 'fettiger Stuhl' }[stuhl];
      if (stuhlLabel) zusatz.push(stuhlLabel);
      const letzter = v('a-bauch-letzterstuhl');
      const obstipation = c('a-bauch-obstipation') ? 'keine Obstipation' : 'Obstipation';
      zusatz.push(letzter ? `${obstipation} (letzter Stuhlgang vor ${letzter})` : obstipation);
      return { main, extra: list(zusatz) };
    }
    case 'dysurie': {
      const akut = akuitaetLabel('a-dys');
      P('O', v('a-dys-onset'));
      P('T', v('a-dys-verlauf'));
      const extra = list([
        c('a-dys-pollakisurie') ? 'Pollakisurie/Urge' : '',
        c('a-dys-fieber') ? 'Fieber/Schüttelfrost' : '',
        c('a-dys-ausfluss') ? 'genitaler Ausfluss/Juckreiz' : '',
        c('a-dys-flanke') ? 'Flankenschmerzen' : ''
      ]);
      const main = `Dysurie (${[akut, ...parts].join(', ')})`;
      return { main, extra };
    }
    case 'diarrhoe': {
      const akut = akuitaetLabel('a-diarr');
      const qual = { waessrig: 'wässrige', blutig: 'blutige', schleimig: 'schleimige' }[r('a-diarr-qualitaet')] || 'wässrige';
      const dauer = v('a-diarr-dauer');
      const freq = v('a-diarr-frequenz');
      const ursacheKey = r('a-diarr-ursache');
      const ursacheText = v('a-diarr-ursache-text');
      const ursache = { ced: 'bekannter CED', infektion: 'bekannter Infektion', immunsuppression: 'bekannter Immunsuppression' }[ursacheKey];
      const inner = [akut];
      if (dauer) inner.push(`O: seit ${dauer}`);
      if (freq) inner.push(`S: ${freq}`);
      const main = `${cap(qual)} Diarrhoe (${inner.join(', ')})`;
      let extra = '';
      if (ursache) extra = `bei ${ursache}${ursacheText ? ' (' + ursacheText + ')' : ''}`;
      else if (ursacheText) extra = ursacheText;
      return { main, extra };
    }
    case 'schwindel': {
      const akut = akuitaetLabel('a-schwindel');
      const typ = r('a-schwindel-typ') === 'schwank' ? 'Schwankschwindel' : 'Drehschwindel';
      const beginn = r('a-schwindel-beginn') === 'schleichend' ? 'schleichend' : 'plötzlich';
      const dauer = v('a-schwindel-dauer');
      const trigger = v('a-schwindel-trigger');
      const extra = list([
        c('a-schwindel-neuro') ? 'neurologische Auffälligkeiten' : '',
        c('a-schwindel-hoerminderung') ? 'Hörminderung/Tinnitus' : '',
        c('a-schwindel-kardial') ? 'kardiale Leitsymptome' : ''
      ]);
      let main = `${typ} (${akut}): ${beginn}${dauer ? ' seit ' + dauer : ''}`;
      if (trigger) main += `, Auftreten bei ${trigger}`;
      return { main, extra };
    }
    case 'teerstuhl': {
      const akut = akuitaetLabel('a-teer');
      const dauer = v('a-teer-dauer');
      const freq = v('a-teer-frequenz');
      const extra = list([
        c('a-teer-haematochezie') ? 'Hämatochezie' : '',
        c('a-teer-haematemesis') ? 'Hämatemesis' : '',
        c('a-teer-oberbauch') ? 'Oberbauchschmerzen' : '',
        c('a-teer-kardial') ? 'kardiale Symptome' : ''
      ]);
      const inner = [akut];
      if (dauer) inner.push(`seit ${dauer}`);
      if (freq) inner.push(freq);
      const main = `Teerstuhl (${inner.join(', ')})`;
      return { main, extra };
    }
    case 'haematochezie': {
      const akut = akuitaetLabel('a-haem');
      const dauer = v('a-haem-dauer');
      const qual = { hellrot: 'hellrot', dunkelrot: 'dunkelrot', teerartig: 'teerartig' }[r('a-haem-qualitaet')];
      const region = v('a-haem-region');
      const freq = v('a-haem-frequenz');
      const extra = list([
        c('a-haem-bauchschmerz') ? 'Bauchschmerzen' : '',
        c('a-haem-gewichtsverlust') ? 'Gewichtsverlust' : '',
        c('a-haem-diarrhoe') ? 'Diarrhoe' : '',
        c('a-haem-kardial') ? 'kardiale Symptome' : '',
        c('a-haem-defaekationsschmerz') ? 'Defäkationsschmerz' : ''
      ]);
      const inner = [akut];
      if (dauer) inner.push(`O: seit ${dauer}`);
      if (qual) inner.push(`Q: ${qual}`);
      if (region) inner.push(`R: ${region}`);
      if (freq) inner.push(`S: ${freq}`);
      const main = `Hämatochezie (${inner.join(', ')})`;
      return { main, extra };
    }
    case 'sonstige': {
      const akut = akuitaetLabel('a-sonst');
      P('O', v('a-sonst-onset'));
      P('P', v('a-sonst-provokation'));
      P('Q', v('a-sonst-qualitaet'));
      P('R', v('a-sonst-region'));
      const staerke = v('a-sonst-staerke');
      P('S', staerke ? `${staerke}/10` : '');
      P('T', v('a-sonst-verlauf'));
      const main = `Schmerzen (${[akut, ...parts].join(', ')})`;
      return { main, extra: '' };
    }
    default:
      return null;
  }
}

function getSymptomBlocks(keys) {
  return keys.map((k) => ({ key: k, ...buildSymptomBlock(k) })).filter((b) => b.main);
}

/* Facts implied by the selected Leitsymptome + their checked accompanying
   findings, used to suppress contradicting default negations further down
   in Kardiopulmonal / Vegetativ (e.g. don't say "keine Dyspnoe" once
   Dyspnoe was documented as a Leitsymptom). */
function derivedFacts(blocks) {
  const has = (key) => blocks.some((b) => b.key === key);
  return {
    dyspnoe: has('dyspnoe') || c('a-thor-dyspnoe'),
    angina: c('a-dysp-ap'),
    haemoptysen: c('a-dysp-haemoptysen'),
    palpitationen: c('a-thor-palpitation'),
    hustenAuswurf: c('a-dysp-husten') || c('a-dysp-auswurf'),
    diarrhoe: has('diarrhoe'),
    dysurie: has('dysurie'),
    fieber: c('a-dysp-fieber') || c('a-dys-fieber')
  };
}

/* ---------- section generators ---------- */
function generateAnamnese() {
  const sex = sexForms();
  const out = [];

  const modus = r('a-vorst-modus') === 'rtw' ? 'über RTW' : 'fußläufig';
  const symptomKeys = selectedSymptomKeys();
  const blocks = getSymptomBlocks(symptomKeys);
  const facts = derivedFacts(blocks);

  let introObjekt;
  let symptomExtraLines = [];
  if (blocks.length) {
    introObjekt = list(blocks.map((b) => b.main));
    const multi = blocks.length > 1;
    symptomExtraLines = blocks
      .filter((b) => b.extra)
      .map((b) => multi ? `Begleitend (${SYMPTOM_LABELS[b.key]}): ${b.extra}.` : `Begleitend: ${b.extra}.`);
  } else {
    const verlaufText = r('a-vorst-verlauf') === 'chronisch' ? 'chronischen' : 'akuten';
    const anlass = v('a-vorst-anlass') || 'Beschwerden';
    introObjekt = `${verlaufText} ${anlass}`;
  }
  out.push(`Die Vorstellung ${sex.nounGen} in der Rettungsstelle erfolgte ${modus} bei ${introObjekt}.`);
  symptomExtraLines.forEach((line) => out.push(line));
  out.push('');

  out.push('Kardiopulmonal:');
  const kp = list([
    (!facts.dyspnoe && c('a-kp-dyspnoe')) ? 'keine Dyspnoe' : '',
    (!facts.angina && c('a-kp-ap')) ? 'keine Angina pectoris' : '',
    (!facts.palpitationen && c('a-kp-palpitationen')) ? 'keine Palpitationen' : '',
    (!facts.haemoptysen && c('a-kp-haemoptysen')) ? 'keine Hämoptysen' : ''
  ]);
  if (kp) out.push(`${cap(kp)}.`);
  const leistung = r('a-kp-leistung');
  out.push(leistung === 'eingeschraenkt'
    ? `Leistungsfähigkeit eingeschränkt${v('a-kp-leistung-text') ? ' (' + v('a-kp-leistung-text') + ')' : ''}.`
    : 'Leistungsfähigkeit gut.');
  out.push('');

  out.push('Vegetativ:');
  const veg1 = list([
    c('a-veg-appetit') ? 'Appetit gut' : '',
    c('a-veg-durst') ? 'Durst/Trinkmenge unverändert' : '',
    c('a-veg-stuhlgang') ? 'Stuhlgang unauffällig' : '',
    c('a-veg-miktion') ? 'Miktion unauffällig' : '',
    c('a-veg-nykturie') ? 'keine Nykturie' : ''
  ]);
  if (veg1) out.push(`${cap(veg1)}.`);
  if (c('a-veg-infekt')) {
    const infektParts = [
      !facts.hustenAuswurf ? 'kein Husten/Auswurf' : '',
      !facts.diarrhoe ? 'keine Diarrhoe' : '',
      !facts.dysurie ? 'keine Dysurie' : '',
      'keine signifikanten Auslandsaufenthalte'
    ].filter(Boolean);
    out.push(`Keine Infektzeichen: ${infektParts.join(', ')}.`);
  } else if (v('a-veg-infekt-text')) {
    out.push(`${v('a-veg-infekt-text')}.`);
  }
  const bsymp = [];
  bsymp.push(c('a-veg-schlaf') ? 'Schlaf unauffällig' : '');
  const gewicht = r('a-veg-gewicht');
  if (gewicht === 'abnehmend' || gewicht === 'zunehmend') {
    const von = v('a-veg-gewicht-von');
    const auf = v('a-veg-gewicht-auf');
    const monate = v('a-veg-gewicht-monate');
    let gtext = `Gewicht ${gewicht}`;
    if (von && auf) gtext += ` (von ${von} kg auf ${auf} kg${monate ? ' in ' + monate + ' Monaten' : ''})`;
    bsymp.push(gtext);
  } else {
    bsymp.push('Gewicht konstant');
  }
  bsymp.push(c('a-veg-nachtschweiss') ? 'kein Nachtschweiß' : '');
  bsymp.push((!facts.fieber && c('a-veg-fieber')) ? 'kein Fieber' : '');
  const bsympText = list(bsymp.filter(Boolean));
  if (bsympText) out.push(`B-Symptomatik: ${bsympText}.`);
  out.push('');

  const raucher = r('a-sub-raucher');
  const py = v('a-sub-py');
  let rauchText;
  if (raucher === 'ex') rauchText = `Ex-Raucher${sex.inSuffix}${py ? ' (' + py + ')' : ''}`;
  else if (raucher === 'ja') rauchText = `Raucher${sex.inSuffix}${py ? ' (' + py + ')' : ''}`;
  else rauchText = `Nichtraucher${sex.inSuffix}${py ? ' (' + py + ')' : ''}`;

  const alkoholKey = r('a-sub-alkohol');
  const alkoholText = v('a-sub-alkohol-text');
  let alkohol;
  if (alkoholKey === 'gelegentlich') alkohol = `gelegentlicher Alkoholkonsum${alkoholText ? ' (' + alkoholText + ')' : ''}`;
  else if (alkoholKey === 'regelmaessig') alkohol = `regelmäßiger Alkoholkonsum${alkoholText ? ' (' + alkoholText + ')' : ''}`;
  else alkohol = 'kein Alkoholkonsum';

  const drogenKey = r('a-sub-drogen');
  const drogenText = v('a-sub-drogen-text');
  const drogen = drogenKey === 'ja' ? `Drogenkonsum${drogenText ? ' (' + drogenText + ')' : ''}` : 'keine Drogen';

  out.push(`Substanzanamnese: ${rauchText}, ${alkohol}, ${drogen}.`);
  out.push('');

  out.push(`Allergien: ${v('a-allergien') || 'keine bekannt'}.`);
  out.push('');
  out.push(`Familienanamnese: ${v('a-familienanamnese') || 'unauffällig'}.`);

  const berufKey = r('a-sozial-beruf');
  const berufText = v('a-sozial-beruf-text');
  const beruf = berufKey === 'berentet' ? 'berentet' : `berufstätig${berufText ? ' (' + berufText + ')' : ''}`;
  const wohnKey = r('a-sozial-wohn');
  const wohnText = v('a-sozial-wohn-text');
  const wohn = wohnKey === 'partner' ? 'mit Partner/in lebend' : (wohnKey === 'sonstige' ? (wohnText || '___') : 'alleine lebend');
  const pg = c('a-sozial-pg') ? 'kein Pflegegrad' : `Pflegegrad ${v('a-sozial-pg-grad') || '___'}`;
  out.push(`Sozialanamnese: ${beruf}; ${wohn}. ${cap(pg)}.`);

  out.push(`Reiseanamnese: ${v('a-reiseanamnese') || 'unauffällig'}.`);
  out.push(`Operationen: ${v('a-operationen') || 'keine'}.`);
  out.push('');
  out.push(`Medikation: ${v('a-medikation') || 'keine Dauermedikation'}.`);

  return out.join('\n');
}

function generateStatus() {
  const sex = sexForms();
  const alter = v('g-alter') || 'XX';
  const az = v('s-az') || 'gutem';
  const ez = v('s-ez') || 'altersentsprechendem';
  const groesse = v('s-groesse') || 'XX';
  const gewicht = v('s-gewicht') || 'XX';

  const out = [];
  out.push(`${alter}-jährig${sex.e} ${sex.noun} in ${az} AZ und ${ez} EZ (${groesse} cm, ${gewicht} kg).`);

  out.push(`Kopf und Hals: ${toggleText('s-kh-unauffaellig', 'Unauffällig, keine Halsveneneinflussstauung', 's-kh-text')}.`);

  const corAktion = r('s-cor-aktion') === 'arrhythmisch' ? 'Herzaktion arrhythmisch' : 'Herzaktion rhythmisch';
  const corToene = r('s-cor-toene') === 'pathologisch' ? (v('s-cor-toene-text') || '___') : 'Herztöne rein';
  out.push(`Cor: ${corAktion}, ${corToene}.`);

  const pulmoBelueftung = toggleText('s-pulmo-belueftung', 'seitengleich gut belüftet', 's-pulmo-belueftung-text');
  const klopfschall = r('s-pulmo-klopfschall') === 'gedaempft' ? 'gedämpfter Klopfschall' : 'sonorer Klopfschall';
  const ag = { vesikulaer: 'vesikuläres Atemgeräusch', abgeschwaecht: 'abgeschwächtes Atemgeräusch', bronchial: 'bronchiales Atemgeräusch' }[r('s-pulmo-ag')] || 'vesikuläres Atemgeräusch';
  const rg = toggleText('s-pulmo-rg', 'keine Rasselgeräusche', 's-pulmo-rg-text');
  out.push(`Pulmo: ${pulmoBelueftung}, ${klopfschall}, ${ag}, ${rg}.`);

  const bauchdecke = r('s-abd-bauchdecke') === 'gespannt' ? 'Bauchdecke gespannt' : 'Bauchdecke weich';
  const druckschmerz = toggleText('s-abd-druckschmerz', 'kein Druckschmerz', 's-abd-druckschmerz-text');
  const resistenzen = toggleText('s-abd-resistenzen', 'keine Resistenzen tastbar', null);
  const heparlien = toggleText('s-abd-heparlien', 'Hepar et Lien nicht palpabel', null);
  const nierenlager = toggleText('s-abd-nierenlager', 'Nierenlager indolent', null);
  const peristaltik = { regelrecht: 'Peristaltik regelrecht', lebhaft: 'Peristaltik lebhaft', spaerlich: 'Peristaltik spärlich' }[r('s-abd-peristaltik')] || 'Peristaltik regelrecht';
  out.push(`Abdomen: ${list([bauchdecke, druckschmerz, resistenzen, heparlien, nierenlager, peristaltik], ' und ')}.`);

  const beweglich = toggleText('s-ext-beweglich', 'aktiv und passiv uneingeschränkt beweglich', null);
  const varikosis = toggleText('s-ext-varikosis', 'keine Varikosis', null);
  const oedeme = toggleText('s-ext-oedeme', 'keine Ödeme', null);
  const puls = r('s-ext-puls') === 'abgeschwaecht' ? 'Pulsstatus abgeschwächt' : 'Pulsstatus regelrecht';
  out.push(`Extremitäten: ${list([beweglich, varikosis, oedeme], ' und ')}. ${puls}.`);

  const wach = toggleText('s-zns-wach', 'wach und 4-fach orientiert', null);
  const perrl = toggleText('s-zns-perrl', 'PERRL', null);
  const motorik = toggleText('s-zns-motorik', 'bewegt 4/4 Extremitäten spontan', null);
  const gang = r('s-zns-gang') === 'auffaellig' ? (v('s-zns-gang-text') || '___') : 'Stand und Gang unauffällig';
  out.push(`ZNS: Pat. ${list([wach, perrl, motorik], ' und ')}, ${gang}.`);

  return out.join('\n');
}

function generateSono() {
  const out = [];
  if (c('o-abd-durchgefuehrt')) {
    out.push('Abdomen-SONO');
    const leber = toggleText('o-abd-leber', 'Leber, Gallenblase und Gallenwege unauffällig', 'o-abd-leber-text');
    const pankreas = toggleText('o-abd-pankreas', 'Pankreas soweit beurteilbar unauffällig', 'o-abd-pankreas-text');
    const milznieren = toggleText('o-abd-milznieren', 'Milz und Nieren regelrecht, kein Harnstau', 'o-abd-milznieren-text');
    const fluessigkeit = toggleText('o-abd-fluessigkeit', 'keine freie Flüssigkeit/Luft', 'o-abd-fluessigkeit-text');
    const beurteilung = toggleText('o-abd-beurteilung', 'kein sonographischer Hinweis auf eine akute intraabdominelle Pathologie', 'o-abd-beurteilung-text');
    out.push(`${leber}. ${pankreas}. ${milznieren}. ${cap(fluessigkeit)}. ${cap(beurteilung)}.`);
    out.push('');
  }
  if (c('o-tte-durchgefuehrt')) {
    out.push('Fokussiertes TTE:');
    const lv = { gut: 'Gute linksventrikuläre Pumpfunktion', mittel: 'Mittelgradig eingeschränkte linksventrikuläre Pumpfunktion', hoch: 'Hochgradig eingeschränkte linksventrikuläre Pumpfunktion' }[r('o-tte-lv')] || 'Gute linksventrikuläre Pumpfunktion';
    const rv = toggleText('o-tte-rv', 'rechter Ventrikel nicht dilatiert', 'o-tte-rv-text');
    const perikard = toggleText('o-tte-perikard', 'kein Perikarderguss', 'o-tte-perikard-text');
    const klappen = toggleText('o-tte-klappen', 'keine höhergradigen Klappenvitien', 'o-tte-klappen-text');
    const rechtsherz = toggleText('o-tte-rechtsherz', 'keine relevante Rechtsherzbelastung', 'o-tte-rechtsherz-text');
    const vci = toggleText('o-tte-vci', 'V. cava inferior nicht gestaut', 'o-tte-vci-text');
    out.push(`${lv}, ${rv}, ${perikard}, ${klappen}, ${rechtsherz}. ${cap(vci)}.`);
  }
  return out.join('\n');
}

function generateVerlauf() {
  const sex = sexForms();
  const out = [];

  if (c('v-intro')) out.push('Vorstellung bei o. g. Anamnese.');

  const aufnahmeDefault = `Bei Aufnahme wach${sex.e}, allseits orientiert${sex.e} ${sex.noun} in stabilem Allgemein- und Kreislaufzustand, kardiopulmonal kompensiert.`;
  out.push(c('v-aufnahme-zustand') ? aufnahmeDefault : (v('v-aufnahme-zustand-text') || '___'));

  const koerperlich = r('v-koerperlich') === 'pathologisch'
    ? `In der internistischen körperlichen Untersuchung zeigte sich ${v('v-koerperlich-text') || '___'}.`
    : 'In der internistischen körperlichen Untersuchung zeigte sich kein richtungsweisender pathologischer Befund.';
  out.push(koerperlich);
  out.push('');

  if (c('v-ekg-durchgefuehrt')) {
    const ekg = r('v-ekg-befund') === 'auffaellig'
      ? `Im 12-Kanal-EKG zeigte sich ${v('v-ekg-text') || '___'}.`
      : 'Im 12-Kanal-EKG zeigte sich ein unauffälliger Befund ohne Hinweis auf akute Ischämie oder relevante Rhythmusstörung.';
    out.push(ekg);
  }

  if (c('v-labor-durchgefuehrt')) {
    const laborAuff = v('v-labor-auffaellig');
    out.push(laborAuff
      ? `Laborchemisch zeigte sich bis auf ${laborAuff} kein wesentlicher pathologischer Befund.`
      : 'Laborchemisch zeigte sich kein wesentlicher pathologischer Befund.');
  }
  if (c('v-bga-durchgefuehrt')) {
    const bgaAuff = v('v-bga-auffaellig');
    out.push(bgaAuff
      ? `In der venösen BGA zeigte sich bis auf ${bgaAuff} ebenfalls kein relevanter pathologischer Befund.`
      : 'In der venösen BGA zeigte sich ebenfalls kein relevanter pathologischer Befund.');
  }
  out.push('');

  if (c('v-sono-durchgefuehrt')) out.push(`In der fokussierten sonographischen Untersuchung zeigte sich ${v('v-sono-text') || '___'}.`);
  if (c('v-rxthorax-durchgefuehrt')) out.push(`Im Röntgen-Thorax zeigte sich ${v('v-rxthorax-text') || '___'}.`);
  if (c('v-ct-durchgefuehrt')) {
    const bereich = v('v-ct-bereich');
    out.push(`Eine ergänzend durchgeführte CT-Untersuchung${bereich ? ' (' + bereich + ')' : ''} ergab ${v('v-ct-text') || '___'}.`);
  }
  out.push('');

  if (c('v-therapie-durchgefuehrt')) {
    const therapien = list([
      c('v-therapie-volumen') ? 'intravasaler Volumentherapie' : '',
      c('v-therapie-antibiotisch') ? 'antibiotischer Therapie' : '',
      c('v-therapie-supportiv') ? 'supportiver medikamentöser Therapie' : ''
    ]);
    const verlaufText = r('v-therapie-verlauf') === 'stabil'
      ? 'ein stabiler klinischer Verlauf und keine relevante Befunddynamik'
      : 'eine klinische Besserung';
    out.push(`Unter ${therapien || '___'} zeigte sich im Verlauf ${verlaufText}.`);
    out.push('');
  }

  const zusModus = r('v-zusammenschau-modus');
  const diagnose = v('v-zusammenschau-diagnose') || '___';
  const zus = zusModus === 'verdacht'
    ? `am ehesten das Bild einer/eines ${diagnose}`
    : `kein Hinweis auf ${diagnose}`;
  out.push(`In der Zusammenschau von Anamnese, klinischem Befund und apparativer Diagnostik ergibt sich ${zus}.`);
  out.push('');

  const disposition = r('v-disposition');
  if (disposition === 'stationaer') {
    out.push(`Nach Rücksprache mit dem AvD ${v('v-disp-avd') || '___'} erfolgt freundlicherweise die stationäre Übernahme zur weiteren Diagnostik und Therapie.`);
  } else {
    const entlassungIntro = c('v-disp-entlassung-avd')
      ? `Nach Rücksprache mit dem AvD ${v('v-disp-entlassung-avd-name') || '___'} erfolgt bei stabilem klinischem Zustand und fehlendem Hinweis auf eine akut stationär behandlungsbedürftige Erkrankung die Entlassung in die Häuslichkeit.`
      : 'Bei stabilem klinischem Zustand und fehlendem Hinweis auf eine akut stationär behandlungsbedürftige Erkrankung erfolgt die Entlassung in die Häuslichkeit.';
    out.push(`${entlassungIntro} Wir empfehlen ${v('v-disp-empfehlung') || '___'} sowie die zeitnahe ambulante Weiterbetreuung. Bei klinischer Verschlechterung, insbesondere ${v('v-disp-warnsymptome') || '___'}, bitten wir um umgehende ärztliche Wiedervorstellung.`);
  }

  return out.join('\n');
}

/* ---------- output wiring ---------- */
function setOutput(id, text) {
  const el = $(id);
  if (el) el.value = clean(text);
}

function generateAll() {
  setOutput('out-anamnese', generateAnamnese());
  setOutput('out-status', generateStatus());
  setOutput('out-sono', generateSono());
  setOutput('out-verlauf', generateVerlauf());
}

/* ---------- conditional field visibility ---------- */
function fieldCurrentValue(field) {
  const el = $(field);
  if (el) {
    if (el.type === 'checkbox') return el.checked ? 'on' : 'off';
    return el.value;
  }
  const checked = document.querySelector(`input[name="${field}"]:checked`);
  return checked ? checked.value : '';
}

function updateConditionalVisibility() {
  document.querySelectorAll('[data-show-if]').forEach((el) => {
    const [field, expected] = el.getAttribute('data-show-if').split('=');
    const current = fieldCurrentValue(field);
    const accepted = expected.split('|');
    el.hidden = !accepted.includes(current);
  });
}

/* ---------- persistence (localStorage only, no network) ---------- */
const STORAGE_KEY = 'notaufnahme-tool-v1';

function saveToStorage() {
  const data = { text: {}, checks: {}, radios: {}, symptomOrder };
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.classList.contains('output')) return;
    if (el.type === 'radio') {
      if (el.checked) data.radios[el.name] = el.value;
    } else if (el.type === 'checkbox') {
      if (el.id) data.checks[el.id] = el.checked;
    } else if (el.id) {
      data.text[el.id] = el.value;
    }
  });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

function loadFromStorage() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { data = null; }
  if (!data) return;
  Object.entries(data.text || {}).forEach(([id, val]) => { const el = $(id); if (el) el.value = val; });
  Object.entries(data.checks || {}).forEach(([id, val]) => { const el = $(id); if (el) el.checked = val; });
  Object.entries(data.radios || {}).forEach(([name, val]) => {
    const el = document.querySelector(`input[name="${name}"][value="${CSS.escape(val)}"]`);
    if (el) el.checked = true;
  });
  if (Array.isArray(data.symptomOrder)) symptomOrder = data.symptomOrder.slice();
}

/* ---------- event wiring ---------- */
function handleFormEvent() {
  updateConditionalVisibility();
  generateAll();
  saveToStorage();
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $('panel-' + btn.dataset.tab).classList.add('active');
    });
  });
}

function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = $(btn.dataset.target);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.value);
      } catch (e) {
        target.removeAttribute('readonly');
        target.select();
        document.execCommand('copy');
        target.setAttribute('readonly', 'readonly');
      }
      const original = btn.textContent;
      btn.textContent = 'Kopiert ✓';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = original; btn.classList.remove('copied'); }, 1500);
    });
  });
}

function initReset() {
  $('reset-btn').addEventListener('click', () => {
    if (!confirm('Alle Eingaben zurücksetzen?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initTabs();
  initCopyButtons();
  initReset();
  updateConditionalVisibility();
  generateAll();
  document.addEventListener('input', handleFormEvent);
  document.addEventListener('change', handleFormEvent);
});
