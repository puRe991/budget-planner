# Haushalts-Budgetplaner

Eine lokale React-Web-App für die Budgetplanung mehrerer Personen in einem Haushalt. Die wichtigste Frage steht dauerhaft oben im Produkt:

> Wie viel Geld darf der Haushalt heute und diese Woche noch ausgeben, damit das Geld bis Monatsende reicht?

## Die Monatsende-Garantie

Der Betrag „Heute sicher ausgeben“ ist keine Schätzung, sondern das Ergebnis einer Tag-für-Tag-Simulation:

1. Startpunkt sind die erfassten Kontostände.
2. Für jeden Tag bis Monatsende werden erwartete Einnahmen dazugerechnet und alle offenen Rechnungen an ihrem Fälligkeitstag abgezogen. Überfällige Rechnungen gelten als sofort fällig.
3. Pflichtsparen bleibt dauerhaft reserviert.
4. Frei verfügbar ist der größte Betrag, der an **jedem** Tag ausgegeben werden kann, ohne dass der Kontostand an irgendeinem Tag unter die Reserve fällt:

   ```
   sicher pro Tag = min über alle Tage i von (Kontostand am Tag i - Reserve) / (Anzahl Tage bis i)
   ```

Deshalb kann das Tageslimit vor dem Zahltag niedrig sein, obwohl am Monatsende rechnerisch mehr übrig bleibt: Das Geld muss erst bis zum nächsten Geldeingang reichen. Der Wert wird jeden Tag neu berechnet und steigt, sobald erwartete Einnahmen eingegangen sind.

Reicht das Geld nicht, meldet die App die genaue Deckungslücke mit Datum und schlägt konkrete Schritte vor (weniger pro Tag ausgeben, nicht kritische Rechnungen verschieben, Pflichtsparen pausieren).

## Funktionen

- Dashboard mit aktuellen Kontoständen, Restgeld bis Monatsende, garantiertem Tages- und Wochenbetrag, bezahlten Ausgaben und offenen Rechnungen.
- Rechnungs-Assistent (`Rechnungen`) mit Zahlungsplan nach Dringlichkeit (überfällig, heute fällig, diese Woche, später), Deckungs-Check und Liquiditätsverlauf bis Monatsende.
- Rechnung mit einem Klick bezahlen: Der Betrag wird als bezahlt markiert und direkt vom gewählten Konto abgebucht, damit Kontostand und Planung zusammenbleiben.
- Warnbanner für überfällige und heute fällige Rechnungen sowie für jede Deckungslücke.
- Manuell anpassbare Kontostände für Girokonto, Bargeld oder weitere Konten; diese Werte werden für die Budgetprognose genutzt.
- Personenverwaltung für Einkommen, persönliches freies Budget, Kostenanteil und optionale Sparziele.
- Erfassung von Einnahmen wie Gehalt, Sozialleistungen, Kindergeld, Unterhalt, Nebenjob, Rückzahlungen und sonstige Einnahmen.
- Erfassung von Fixkosten und variablen Ausgaben inklusive Status `offen` oder `bezahlt`, Wiederholung, benutzerdefiniertem Intervall wie „alle 3 Tage“ und Notiz.
- Automatische Monatsende-Berechnung:
  - Restgeld = aktuelle Kontostände + noch erwartete Einnahmen - offene Rechnungen - verpflichtende Sparziele
  - Sicherer Tagesbetrag = siehe „Monatsende-Garantie“ oben (berücksichtigt jeden einzelnen Fälligkeitstermin)
  - Wochenbetrag = sicherer Tagesbetrag × 7
- Ampel-Warnsystem mit Grün/Gelb/Rot: Rot, sobald eine Rechnung nicht gedeckt ist, Gelb bei überfälligen Rechnungen. Die Aufbrauch-Prognose nutzt nur den laufenden variablen Verbrauch, damit bereits bezahlte Fixkosten wie die Miete die Prognose nicht verfälschen.
- Monats-, Wochen- und Tagesansicht inklusive schneller Ausgabe für heute.
- Haushaltsrealität-Ansicht mit Kategorie-Umschlägen, Fälligkeiten der nächsten 7 Tage, unregelmäßigen Einnahmen, Verschiebe-Szenarien und Konto-vs.-Plan-Abgleich.
- Bereiche für Schulden/Raten und Sparziele; Schulden können optional direkt als offene monatliche Fixkosten in das Budget übernommen werden.
- Kategorien für Wohnen, Energie, Kommunikation, Lebensmittel, Mobilität, Versicherungen, Schulden, Gesundheit, Haustiere, Kinder, Freizeit, Kleidung, Abos und Sonstiges.
- Manueller CSV-Export, JSON-Backup, JSON-Import und PDF-Export über die Browserfunktion „Drucken → Als PDF speichern“.
- Sofortige lokale Speicherung im Browser (`localStorage`) nach jeder Änderung, keine versteckten Tracking-Funktionen.

## Start unter Windows (empfohlen)

Im Projektordner **`start-budget-planner.cmd` doppelklicken**. Mehr ist nicht nötig.

Das Skript richtet beim ersten Start alles selbst ein und startet danach die App:

1. prüft, ob Python und Node.js installiert sind,
2. legt die virtuelle Python-Umgebung `.venv` an,
3. installiert die Python-Abhängigkeiten,
4. installiert die Client-Abhängigkeiten (`client/node_modules`),
5. startet Server und Oberfläche; der Browser öffnet sich automatisch auf <http://localhost:3000>.

Beim ersten Start dauern die Schritte 3 und 4 einige Minuten. Ab dem zweiten Start werden bereits vorhandene Teile übersprungen und die App startet direkt. Fehlt Python oder Node.js, nennt das Skript die Download-Adresse, statt mit einem Traceback abzubrechen.

Zum Beenden `Strg + C` drücken oder das Fenster schließen.

## Lokale Entwicklung

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
npm install --prefix client
npm run dev
```

### Windows-Fehlerbehebung (häufig)

`npm run dev` prüft vor dem Start selbst, ob alles da ist, und nennt den fehlenden Schritt. Die beiden häufigsten Meldungen:

**„Die Python-Abhängigkeiten fehlen (kein Modul 'flask')"** – im **Projekt-Root** ausführen:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**„Die Client-Abhängigkeiten fehlen"** – `npm install` im Projekt-Root reicht nicht, die React-App liegt im Unterordner `client`:

```bash
npm install --prefix client
```

Danach `npm run dev` erneut starten. Wenn im `client`-Ordner `npm run dev` fehlt: Es gibt dort einen Alias, der intern `npm start` nutzt.

> Hinweis: `FileNotFoundError: [WinError 2]` beim Start von npm trat in älteren Ständen auf, weil npm unter Windows `npm.cmd` heißt. Das Startskript löst den Pfad jetzt selbst auf.

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

1. Einmal `start-budget-planner.cmd` doppelklicken und prüfen, dass die App startet.
2. Mit `Win + R` den Ordner `shell:startup` öffnen.
3. Eine Verknüpfung zu `scripts\windows-autostart-budget-planner.cmd` in diesen Autostart-Ordner legen.

Beim nächsten Windows-Login öffnet das Autostart-Skript ein Fenster und ruft darin `start-budget-planner.cmd` auf. Beide Wege nutzen also dieselbe Einrichtung und können nicht auseinanderlaufen.

## Beispieldaten

Die App startet mit Beispieldaten für zwei Personen, 2.500 € Monatseinnahmen, bezahlten Fixkosten, bereits variablen Ausgaben und offenen Pflichtausgaben. Am 15. Mai 2026 bleiben inklusive Starttag 17 Tage bis Monatsende: 1.000 € auf den Konten, 120 € Strom heute und 80 € Versicherung am 20. fällig - es bleiben 800 € für 17 Tage, also 47,06 € pro Tag.

Für einen produktiven Erststart sollte nach der Funktionsprüfung ein eigener Datenstand aufgebaut bzw. ein eigener JSON-Backup-Stand importiert werden.

## Architektur

- `server/app.py` enthält die Python/Flask-API für Status, Notion-Daten, Budget-Zusammenfassungen (`POST /api/budget/summary`) und den Zahlungsplan (`POST /api/budget/payment-plan`).
- `server/notion.py` enthält die Notion-Abfrage inklusive Pagination, Validierung und Normalisierung.
- `budget_planner/budget_engine.py` enthält die in Python übernommene Budgetlogik inklusive `build_bill_schedule`, `build_payment_plan` (Liquiditätsverlauf und Monatsende-Garantie), Beispieldaten und testbaren Berechnungsfunktionen.
- `client/src/resources/scripts/budgetEngine.ts` enthält die identische clientseitige Budgetlogik für die React-Oberfläche.
- `tests/test_budget_engine.py` sichert die Kernrechnungen ab: Deckung aller Rechnungen, Engpass vor dem Zahltag, Deckungslücke, überfällige Rechnungen und reserviertes Pflichtsparen (`python -m pytest tests`).
- `client/src/components/householdPlanner/HouseholdPlanner.tsx` enthält die produktive Oberfläche für Dashboard, Personen, Einnahmen, Ausgaben, Monats-, Wochen-, Tagesansicht, Schulden, Sparziele und Import/Export.
- `client/src/components/householdPlanner/householdPlanner.scss` enthält das mobile, kartenbasierte Finanz-UX-Design.
