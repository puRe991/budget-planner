# Haushalts-Budgetplaner

Eine lokale React-Web-App für die Budgetplanung mehrerer Personen in einem Haushalt. Die wichtigste Frage steht dauerhaft oben im Produkt:

> Wie viel Geld darf der Haushalt heute und diese Woche noch ausgeben, damit das Geld bis Monatsende reicht?

## Funktionen

- Dashboard mit aktuellen Kontoständen, Restgeld bis Monatsende, Tagesbudget, Wochenbudget, bezahlten Ausgaben und offenen Fixkosten.
- Manuell anpassbare Kontostände für Girokonto, Bargeld oder weitere Konten; diese Werte werden für die Budgetprognose genutzt.
- Personenverwaltung für Einkommen, persönliches freies Budget, Kostenanteil und optionale Sparziele.
- Erfassung von Einnahmen wie Gehalt, Sozialleistungen, Kindergeld, Unterhalt, Nebenjob, Rückzahlungen und sonstige Einnahmen.
- Erfassung von Fixkosten und variablen Ausgaben inklusive Status `offen` oder `bezahlt`, Wiederholung, benutzerdefiniertem Intervall wie „alle 3 Tage“ und Notiz.
- Automatische Monatsende-Berechnung:
  - Restgeld = aktuelle Kontostände + noch erwartete Einnahmen - offene Pflichtausgaben - verpflichtende Sparziele
  - Tagesbudget = Restgeld / verbleibende Tage bis Monatsende
  - Wochenbudget = Tagesbudget × 7
- Ampel-Warnsystem mit Grün/Gelb/Rot, Prognose zum Aufbrauchdatum, Fehlbetrag und täglichem Sparbedarf.
- Monats-, Wochen- und Tagesansicht inklusive schneller Ausgabe für heute.
- Haushaltsrealität-Ansicht mit Kategorie-Umschlägen, Fälligkeiten der nächsten 7 Tage, unregelmäßigen Einnahmen, Verschiebe-Szenarien und Konto-vs.-Plan-Abgleich.
- Bereiche für Schulden/Raten und Sparziele; Schulden können optional direkt als offene monatliche Fixkosten in das Budget übernommen werden.
- Kategorien für Wohnen, Energie, Kommunikation, Lebensmittel, Mobilität, Versicherungen, Schulden, Gesundheit, Haustiere, Kinder, Freizeit, Kleidung, Abos und Sonstiges.
- Manueller CSV-Export, JSON-Backup, JSON-Import und PDF-Export über die Browserfunktion „Drucken → Als PDF speichern“.
- Sofortige lokale Speicherung im Browser (`localStorage`) nach jeder Änderung, keine versteckten Tracking-Funktionen.

## Lokale Entwicklung

```bash
npm install
npm install --prefix client
npm run dev
```

Alternativ kann nur die React-App gestartet werden:

```bash
npm run client
```

Für einen Produktionsbuild der React-App:

```bash
npm run build --prefix client
```

> Hinweis für Windows und aktuelle Node-Versionen: Das Projekt verwendet `react-scripts@4`. Die Client-Skripte setzen die notwendige OpenSSL-Kompatibilitätsoption automatisch, sodass kein manuelles `NODE_OPTIONS=...` in der Eingabeaufforderung nötig ist.

## Windows-Autostart

Das Projekt kann Windows nicht ungefragt in den Autostart schreiben. Dafür liegt ein Starter-Skript bei:

1. Einmal `scripts\windows-autostart-budget-planner.cmd` testen.
2. Mit `Win + R` den Ordner `shell:startup` öffnen.
3. Eine Verknüpfung zu `scripts\windows-autostart-budget-planner.cmd` in diesen Autostart-Ordner legen.

Beim nächsten Windows-Login startet das Skript `npm run dev` im Projektordner und öffnet danach `http://localhost:3000`.

## Beispieldaten

Die App startet mit Beispieldaten für zwei Personen, 2.500 € Monatseinnahmen, bezahlten Fixkosten, bereits variablen Ausgaben und offenen Pflichtausgaben. Am 15. Mai 2026 bleiben damit 16 Tage bis Monatsende, sodass die Kernberechnung direkt überprüfbar ist.

## Architektur

- `client/src/resources/scripts/budgetEngine.ts` enthält Datenmodell, Beispieldaten und testbare Berechnungsfunktionen.
- `client/src/components/householdPlanner/HouseholdPlanner.tsx` enthält die produktive Oberfläche für Dashboard, Personen, Einnahmen, Ausgaben, Monats-, Wochen-, Tagesansicht, Schulden, Sparziele und Import/Export.
- `client/src/components/householdPlanner/householdPlanner.scss` enthält das mobile, kartenbasierte Finanz-UX-Design.
