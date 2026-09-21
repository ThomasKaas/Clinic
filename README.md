# Notaufnahme Textbausteine

Interaktives Formular für die Notaufnahme-Dokumentation (SAMPLER-Schema). Live unter:

**https://thomaskaas.github.io/Clinic/**

Eingaben (Ankreuzfelder, Auswahllisten, Freitext) erzeugen live einen fertigen Fließtext, der pro Abschnitt separat kopiert werden kann:

- **Anamnese** – Vorstellung, Leitsymptom (OPQRST), Kardiopulmonal, Vegetativ, Substanzanamnese, Sozialanamnese, Medikation
- **Status** – körperlicher Untersuchungsbefund
- **Sono** – Abdomen-Sonographie und fokussiertes TTE
- **Verlauf** – Aufnahmebefund, Diagnostik, Therapie, Zusammenschau, Disposition

Alle Eingaben bleiben ausschließlich lokal im Browser (`localStorage`) – es gibt kein Backend und es werden keine Daten übertragen.

Die ursprüngliche Rohvorlage liegt zusätzlich in [`VORLAGE.md`](VORLAGE.md).
