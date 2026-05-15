# Haushalts-Budgetplaner

Eine lokale React-Web-App für die Budgetplanung mehrerer Personen in einem Haushalt. Die wichtigste Frage steht dauerhaft oben im Produkt:

> Wie viel Geld darf der Haushalt heute und diese Woche noch ausgeben, damit das Geld bis Monatsende reicht?

## Funktionen

- Dashboard mit Gesamtgeld, Restgeld bis Monatsende, Tagesbudget, Wochenbudget, bezahlten Ausgaben und offenen Fixkosten.
- Personenverwaltung für Einkommen, persönliches freies Budget, Kostenanteil und optionale Sparziele.
- Erfassung von Einnahmen wie Gehalt, Sozialleistungen, Kindergeld, Unterhalt, Nebenjob, Rückzahlungen und sonstige Einnahmen.
- Erfassung von Fixkosten und variablen Ausgaben inklusive Status `offen` oder `bezahlt`, Wiederholung und Notiz.
- Automatische Monatsende-Berechnung:
  - Restgeld = gesamte Monatseinnahmen - bezahlte Ausgaben - offene Pflichtausgaben - verpflichtende Sparziele
  - Tagesbudget = Restgeld / verbleibende Tage bis Monatsende
  - Wochenbudget = Tagesbudget × 7
- Ampel-Warnsystem mit Grün/Gelb/Rot, Prognose zum Aufbrauchdatum, Fehlbetrag und täglichem Sparbedarf.
- Monats-, Wochen- und Tagesansicht inklusive schneller Ausgabe für heute.
- Bereiche für Schulden/Raten und Sparziele.
- Kategorien für Wohnen, Energie, Kommunikation, Lebensmittel, Mobilität, Versicherungen, Schulden, Gesundheit, Haustiere, Kinder, Freizeit, Kleidung, Abos und Sonstiges.
- Manueller CSV-Export, JSON-Backup, JSON-Import und PDF-Export über die Browserfunktion „Drucken → Als PDF speichern“.
- Lokale Speicherung im Browser (`localStorage`), keine versteckten Tracking-Funktionen.

## Lokale Entwicklung

```bash
npm install --prefix client
NODE_OPTIONS=--openssl-legacy-provider npm run build --prefix client
npm run client
```

> Hinweis: Das Projekt verwendet `react-scripts@4`. Unter aktuellen Node-Versionen ist für den Produktionsbuild `NODE_OPTIONS=--openssl-legacy-provider` nötig.

## Beispieldaten

Die App startet mit Beispieldaten für zwei Personen, 2.500 € Monatseinnahmen, bezahlten Fixkosten, bereits variablen Ausgaben und offenen Pflichtausgaben. Am 15. Mai 2026 bleiben damit 16 Tage bis Monatsende, sodass die Kernberechnung direkt überprüfbar ist.

## Architektur

- `client/src/resources/scripts/budgetEngine.ts` enthält Datenmodell, Beispieldaten und testbare Berechnungsfunktionen.
- `client/src/components/householdPlanner/HouseholdPlanner.tsx` enthält die produktive Oberfläche für Dashboard, Personen, Einnahmen, Ausgaben, Monats-, Wochen-, Tagesansicht, Schulden, Sparziele und Import/Export.
- `client/src/components/householdPlanner/householdPlanner.scss` enthält das mobile, kartenbasierte Finanz-UX-Design.
