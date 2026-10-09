# microservice-architect

Ein browserbasierter Editor, um Microservice-Architekturen zu skizzieren und den Fluss von Events zwischen den Komponenten animiert zu simulieren.

Das gesamte Tool steckt in einer einzigen Datei – `microservice-architect.html` – ohne Build-Schritt, Server oder externe Abhängigkeiten.

## Starten

`microservice-architect.html` einfach im Browser öffnen. Beim Start wird ein Beispieldiagramm (Web-Frontend, Auth-Service, Order-Service, Order-DB) geladen.

## Funktionen

### Elemente

| Typ | Beschreibung |
| --- | --- |
| **Service** | Backend-Service; kann optional eine REST-Schnittstelle anbieten (REST-Badge). Solange REST-Verbindungen zum Service bestehen, lässt sich die Schnittstelle nicht abschalten. |
| **Frontend** | Client-Anwendung; bietet selbst keine REST-Schnittstelle an und hat keine Event-Verbindungen. |
| **Datenbank** | Datenspeicher; kann nur antworten, nicht selbst Anfragen stellen. |

Elemente werden über die Toolbar (`+ Service`, `+ Frontend`, `+ Datenbank`) angelegt und per Drag & Drop verschoben. Ein Klick öffnet die Seitenleiste zum Bearbeiten von Name und Beschreibung; die Beschreibung erscheint als Tooltip beim Überfahren mit der Maus.

Ist ein Element Ziel von Events anderer Elemente, erscheint beim Löschen eine Rückfrage mit der Liste dieser Events. Bei **OK** werden Element und Verbindungen gelöscht; Events, die danach noch ein anderes erreichbares Ziel haben, verlieren nur dieses Ziel, alle anderen werden gelöscht.

### Verbindungen

Verbindungen entstehen durch Ziehen an den kleinen Anfassern eines Elements (**R** = REST, **E** = Event) auf ein anderes Element.

| Typ | Darstellung | Regeln |
| --- | --- | --- |
| **REST** | durchgezogener Pfeil | Nur zu Services mit REST-Schnittstelle, nie zu einem Frontend. Optional als **WebSocket** markierbar (Sonderfall von REST, gestrichelt). |
| **Event** | durchgezogener Pfeil | Nicht zu Datenbanken, nicht von/zu Frontends. |
| **Datenbank** | gestrichelt | Entsteht automatisch, wenn eine REST-Verbindung auf eine Datenbank gezogen wird. |

Jede Verbindung kann eine Beschreibung erhalten (z. B. `GET /orders`).

Wird eine Verbindung gelöscht, über die Events ihr Ziel erreichen, erscheint vorher eine Rückfrage mit der Liste dieser Events. Bei **OK** wird die Verbindung gelöscht; Events, die danach noch ein anderes erreichbares Ziel haben, verlieren nur das betroffene Ziel, alle anderen werden gelöscht. Bei **Abbrechen** bleibt alles unverändert. Events, die ihr Ziel noch auf einem anderen Weg erreichen (z. B. als Antwort über eine REST-Verbindung), sind nicht betroffen.

### Event-Simulation

Jedes Element kann in der Seitenleiste unter **Events (Simulator)** beliebig viele Events definieren:

- **Name** – wird bei der Simulation als animiertes Label entlang der Verbindung angezeigt.
- **Trigger** – entweder *Nur Button (manuell)* oder der Name eines anderen Events. Kommt ein Event mit diesem Namen am Element an, wird das eigene Event automatisch ausgelöst.
- **Ziele** – Elemente, an die das Event geschickt wird. Zur Auswahl stehen alle Ziele abgehender Verbindungen sowie Absender eingehender REST-Verbindungen (Antwort auf eine Anfrage).

Besonderheiten:

- Gibt es nur eine eingehende REST- oder DB-Verbindung, läuft die Animation als Antwort entgegen der Pfeilrichtung.
- Datenbank-Events haben kein wählbares Ziel – sie antworten immer an das Element, dessen Event sie ausgelöst hat, und können daher nicht manuell gestartet werden.
- Ketten laufen so lange weiter, bis nichts mehr getriggert wird. Zyklische Trigger (A → B → A) laufen endlos und müssen über **⏹ Simulation stoppen** beendet werden.

### Zyklus-Erkennung

Zyklen in den Event-Ketten werden unabhängig von der Simulation laufend erkannt – nach denselben Regeln, nach denen die Simulation Events weiterleitet (inklusive Antworten von Datenbanken an ihren Absender). Über jedem betroffenen Element erscheint ein roter Kreis mit Ausrufezeichen. Beim Überfahren mit der Maus:

- erscheint die Meldung **„Zyklus erkannt“** mit dem Ablauf als Liste `Element: Event → Empfänger`, beginnend beim Event des überfahrenen Elements (maximal 10 Einträge),
- leuchten die Warnkreise aller Elemente desselben Zyklus auf.

### Ansicht & Bedienung

- **Zoom:** Mausrad (15 % – 300 %)
- **Verschieben:** Ziehen auf freier Fläche
- **⤢ Ansicht zurücksetzen:** Zoom und Position zurücksetzen
- **Entf / Backspace:** ausgewähltes Element bzw. Verbindung löschen
- **🗑 Alles löschen:** leert das gesamte Diagramm (mit Rückfrage)

### Speichern & Laden

Das Diagramm wird **nicht automatisch gespeichert** – nach einem Neuladen der Seite ist es verloren.

- **⭳ Export JSON** lädt das Diagramm als `microservice-architektur.json` herunter.
- **⭱ Import JSON** lädt eine zuvor exportierte Datei. Die Datei wird vorher vollständig geprüft (gültiges JSON, bekannte Typen, eindeutige IDs, Positionen, existierende Verbindungs- und Event-Ziele, Verbindungsregeln). Bei Fehlern erscheint ein Dialog mit allen gefundenen Problemen, und das aktuelle Diagramm bleibt unverändert.

Format:

```json
{
  "nodes": [
    {
      "id": "n3", "type": "service", "name": "Order-Service",
      "x": 80, "y": 60, "offersRest": true, "description": "…",
      "events": [
        { "id": "ev2", "name": "OrderCreated", "trigger": "BestellungAbsenden", "targetIds": ["n2", "n4"] }
      ]
    }
  ],
  "connections": [
    { "id": "c3", "type": "event", "from": "n3", "to": "n2", "description": "OrderCreated", "websocket": false }
  ]
}
```

`type` eines Knotens ist `service`, `frontend` oder `database`; `type` einer Verbindung ist `rest`, `event` oder `db`. Der Trigger-Wert `__button__` steht für „nur manuell per Button“.

## Aufbau des Codes

Alles liegt in `microservice-architect.html`: CSS im `<style>`-Block, das Markup für Toolbar, Seitenleiste und Legende, und ein einzelnes `<script>` (Vanilla JS, SVG-Rendering). Das Skript ist in Abschnitte gegliedert:

- **STATE** – `state.nodes` / `state.connections` als einzige Datenquelle
- **VIEW** – Zoom und Verschieben (`view`, `screenToWorld`)
- **Rendering** – `render()` baut die SVG-Layer bei jeder Änderung neu auf
- **SELECTION / SIDEBAR** – Bearbeitungsformulare für Elemente und Verbindungen
- **SIMULATOR** – `fireEvent` → `travelEvent` (Animation per `requestAnimationFrame`) → `triggerNode`
- **TOOLBAR ACTIONS** – Hinzufügen, Export/Import, Löschen
